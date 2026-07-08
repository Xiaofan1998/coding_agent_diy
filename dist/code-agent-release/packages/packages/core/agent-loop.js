import { stringifyCompact } from "../shared/json.js";

export async function runAgentLoop({
  modelClient,
  systemPrompt,
  conversation,
  toolRegistry,
  config,
  suggestedFirstTools = [],
  createTrace,
  executeTool,
  getSteeringMessages = async () => [],
  getFollowUpMessages = async () => []
}) {
  let finalMessage = "No response generated.";
  let toolSteps = 0;
  let previousResponseId = null;
  let pendingInputItems = null;
  let firstToolEvaluated = false;
  let previousToolSignature = "";
  let repeatedToolCallStreak = 0;
  let stallRedirectCount = 0;
  const supportsResponseContinuation = modelClient.supportsResponseContinuation !== false;
  const maxRepeatedToolCallStreak = normalizePositiveInteger(config.runtime.maxRepeatedToolCallStreak, 4);
  let pendingMessages = await normalizeMessages(await getSteeringMessages());

  while (true) {
    if (pendingMessages.length > 0) {
      conversation.push(...pendingMessages);
      await createTrace({
        kind: "loop_messages_injected",
        source: "steering",
        count: pendingMessages.length,
        messages: pendingMessages
      });
      pendingMessages = [];
      previousResponseId = null;
      pendingInputItems = null;
    }

    const modelTurn = await modelClient.createResponse({
      instructions: systemPrompt,
      conversationItems: supportsResponseContinuation
        ? (pendingInputItems ? undefined : conversation)
        : conversation,
      toolDefinitions: toFunctionTools(toolRegistry.list()),
      previousResponseId: supportsResponseContinuation ? previousResponseId : null,
      inputItems: supportsResponseContinuation ? pendingInputItems : null
    });

    previousResponseId = modelTurn.id;
    await createTrace({
      kind: "model_response",
      responseId: modelTurn.id,
      functionCallCount: modelTurn.functionCalls.length,
      outputText: modelTurn.outputText || "",
      provider: modelTurn.meta?.provider || null,
      providerRequestId: modelTurn.meta?.requestId || null,
      providerHttpStatus: modelTurn.meta?.httpStatus || null,
      retryCount: modelTurn.meta?.attemptCount ? Math.max(0, modelTurn.meta.attemptCount - 1) : 0,
      model: modelTurn.meta?.model || config.openai.model
    });

    if (modelTurn.functionCalls.length === 0) {
      finalMessage = modelTurn.outputText || "Model returned no final text.";
      conversation.push({
        role: "assistant",
        content: finalMessage
      });
      const followUpMessages = await normalizeMessages(await getFollowUpMessages());
      if (followUpMessages.length === 0) {
        break;
      }
      conversation.push(...followUpMessages);
      await createTrace({
        kind: "loop_messages_injected",
        source: "follow_up",
        count: followUpMessages.length,
        messages: followUpMessages
      });
      previousResponseId = null;
      pendingInputItems = null;
      finalMessage = "No response generated.";
      continue;
    }

    const toolOutputs = [];
    const structuredAssistantBlocks = [];
    const structuredToolResultBlocks = [];
    let redirectedForStrategy = false;
    let redirectedForStall = false;

    if (!supportsResponseContinuation && modelTurn.outputText) {
      structuredAssistantBlocks.push({
        type: "text",
        text: modelTurn.outputText
      });
    }

    for (const functionCall of modelTurn.functionCalls) {
      if (!firstToolEvaluated) {
        firstToolEvaluated = true;
        const matchedRecommendation = suggestedFirstTools.includes(functionCall.name);
        await createTrace({
          kind: "first_tool_strategy",
          chosenTool: functionCall.name,
          suggestedFirstTools,
          matchedRecommendation
        });

        if (
          config.runtime.enforceSuggestedFirstTool &&
          suggestedFirstTools.length > 0 &&
          !matchedRecommendation
        ) {
          const guidance = [
            `Strategy notice: first tool "${functionCall.name}" is not in the suggested first tools set.`,
            `Suggested first tools: ${suggestedFirstTools.join(", ")}`,
            "Reconsider and choose one of the suggested aggregated tools first unless a narrower tool is strictly necessary."
          ].join("\n");

          conversation.push({
            role: "user",
            content: guidance
          });
          await createTrace({
            kind: "first_tool_strategy_redirect",
            chosenTool: functionCall.name,
            suggestedFirstTools
          });
          redirectedForStrategy = true;
          break;
        }
      }

      const tool = toolRegistry.get(functionCall.name);
      let normalized;
      let hadError = false;
      try {
        const result = await executeTool(functionCall.name, functionCall.arguments || {});
        normalized = truncate(stringifyCompact(result), config.runtime.maxToolOutputChars);
      } catch (error) {
        hadError = true;
        normalized = truncate(
          stringifyCompact({
            error: error instanceof Error ? error.message : String(error)
          }),
          config.runtime.maxToolOutputChars
        );
      }

      if (supportsResponseContinuation) {
        conversation.push({
          role: "assistant",
          content: `Tool requested: ${functionCall.name}`
        });
        conversation.push({
          role: "user",
          content: `Tool result for ${functionCall.name}:\n${normalized}`
        });
      } else {
        const toolUseId = functionCall.callId || functionCall.id || `${functionCall.name}_${toolSteps + 1}`;
        structuredAssistantBlocks.push({
          type: "tool_use",
          id: toolUseId,
          name: functionCall.name,
          input: functionCall.arguments || {}
        });
        structuredToolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUseId,
          content: normalized,
          is_error: hadError
        });
      }

      await createTrace({
        kind: "tool_call",
        toolName: functionCall.name,
        arguments: functionCall.arguments || {},
        riskLevel: tool.riskLevel || "safe",
        blockedByPolicy: errorIsPolicyBlocked(normalized),
        hadError,
        output: normalized
      });

      const toolSignature = JSON.stringify({
        name: functionCall.name,
        arguments: functionCall.arguments || {},
        output: normalized
      });
      if (toolSignature === previousToolSignature) {
        repeatedToolCallStreak += 1;
      } else {
        previousToolSignature = toolSignature;
        repeatedToolCallStreak = 1;
      }

      if (repeatedToolCallStreak >= maxRepeatedToolCallStreak) {
        await createTrace({
          kind: "loop_stall_detected",
          toolName: functionCall.name,
          repeatedToolCallStreak,
          maxRepeatedToolCallStreak
        });

        if (stallRedirectCount === 0) {
          pendingMessages = [
            {
              role: "user",
              content: [
                `Loop guard: the same tool call "${functionCall.name}" has repeated ${repeatedToolCallStreak} times with no new progress.`,
                "Do not repeat the same tool call again unless you can explain what new information it will produce.",
                "If the task is already answerable, provide the final answer now. Otherwise choose a different tool or explain what is missing."
              ].join("\n")
            }
          ];
          stallRedirectCount += 1;
          redirectedForStall = true;
          break;
        }

        finalMessage = [
          `Stopped because the loop appeared stuck repeating tool "${functionCall.name}" without new progress.`,
          "The agent should now revise its termination conditions or choose a different tool path."
        ].join("\n");
        conversation.push({
          role: "assistant",
          content: finalMessage
        });
        return {
          finalMessage,
          toolSteps,
          conversation,
          supportsResponseContinuation
        };
      }

      toolOutputs.push({
        type: "function_call_output",
        call_id: functionCall.callId,
        output: normalized
      });
      toolSteps += 1;
    }

    if (redirectedForStrategy || redirectedForStall) {
      previousResponseId = null;
      pendingInputItems = null;
      continue;
    }

    if (!supportsResponseContinuation && structuredAssistantBlocks.length > 0) {
      conversation.push({
        role: "assistant",
        content: structuredAssistantBlocks
      });
    }
    if (!supportsResponseContinuation && structuredToolResultBlocks.length > 0) {
      conversation.push({
        role: "user",
        content: structuredToolResultBlocks
      });
    }

    const steeringMessages = await normalizeMessages(await getSteeringMessages());
    if (steeringMessages.length > 0) {
      pendingMessages = steeringMessages;
      continue;
    }

    pendingInputItems = toolOutputs;
  }

  return {
    finalMessage,
    toolSteps,
    conversation,
    supportsResponseContinuation
  };
}

async function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages
    .filter((message) => message && typeof message === "object" && typeof message.role === "string")
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

function truncate(value, maxChars) {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}\n...[truncated]`;
}

function toFunctionTools(toolList) {
  return toolList.map((tool) => ({
    type: "function",
    name: tool.name,
    description: `${tool.description} [risk=${tool.riskLevel}${tool.requiresConfirmation ? ", confirmation" : ""}]`,
    parameters: tool.inputSchema,
    strict: false
  }));
}

function errorIsPolicyBlocked(output) {
  return String(output || "").includes("\"policyReason\"");
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}
