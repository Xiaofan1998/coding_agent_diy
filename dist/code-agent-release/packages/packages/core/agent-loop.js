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
  getFollowUpMessages = async () => [],
  memoryPrefetch = null,
  onEvent = async () => {}
}) {
  let finalMessage = "No response generated.";
  let toolSteps = 0;
  let firstToolEvaluated = false;
  let previousToolSignature = "";
  let repeatedToolCallStreak = 0;
  let stallRedirectCount = 0;
  const maxRepeatedToolCallStreak = normalizePositiveInteger(config.runtime.maxRepeatedToolCallStreak, 4);
  let pendingMessages = await normalizeMessages(await getSteeringMessages());
  await emitEvent(onEvent, { type: "loop_start" });

  while (true) {
    if (pendingMessages.length > 0) {
      conversation.push(...pendingMessages);
      await emitEvent(onEvent, { type: "loop_messages_injected", source: "steering", count: pendingMessages.length, messages: pendingMessages });
      await createTrace({
        kind: "loop_messages_injected",
        source: "steering",
        count: pendingMessages.length,
        messages: pendingMessages
      });
      pendingMessages = [];
    }

    await emitEvent(onEvent, { type: "model_request_start" });
    const modelTurn = await modelClient.createResponse({
      instructions: systemPrompt,
      conversationItems: conversation,
      toolDefinitions: toFunctionTools(toolRegistry.list())
    });

    await emitEvent(onEvent, {
      type: "model_response",
      responseId: modelTurn.id,
      functionCallCount: modelTurn.functionCalls.length,
      outputText: modelTurn.outputText || "",
      provider: modelTurn.meta?.provider || null,
      providerRequestId: modelTurn.meta?.requestId || null,
      providerHttpStatus: modelTurn.meta?.httpStatus || null,
      retryCount: modelTurn.meta?.attemptCount ? Math.max(0, modelTurn.meta.attemptCount - 1) : 0,
      model: modelTurn.meta?.model || config.openai.model
    });
    await createTrace({
      kind: "model_response",
      responseId: modelTurn.id,
      functionCallCount: modelTurn.functionCalls.length,
      outputText: modelTurn.outputText || "",
      thinkingBlockCount: Array.isArray(modelTurn.thinkingBlocks) ? modelTurn.thinkingBlocks.length : 0,
      provider: modelTurn.meta?.provider || null,
      providerRequestId: modelTurn.meta?.requestId || null,
      providerHttpStatus: modelTurn.meta?.httpStatus || null,
      retryCount: modelTurn.meta?.attemptCount ? Math.max(0, modelTurn.meta.attemptCount - 1) : 0,
      model: modelTurn.meta?.model || config.openai.model
    });

    if (modelTurn.functionCalls.length === 0) {
      finalMessage = modelTurn.outputText || "Model returned no final text.";
      await emitEvent(onEvent, { type: "assistant_final", content: finalMessage });
      conversation.push({
        role: "assistant",
        content: buildAssistantContent(modelTurn.thinkingBlocks, finalMessage)
      });
      const followUpMessages = await normalizeMessages(await getFollowUpMessages());
      if (followUpMessages.length === 0) {
        break;
      }
      conversation.push(...followUpMessages);
      await emitEvent(onEvent, { type: "loop_messages_injected", source: "follow_up", count: followUpMessages.length, messages: followUpMessages });
      await createTrace({
        kind: "loop_messages_injected",
        source: "follow_up",
        count: followUpMessages.length,
        messages: followUpMessages
      });
      finalMessage = "No response generated.";
      continue;
    }

    const structuredAssistantBlocks = [];
    const structuredToolResultBlocks = [];
    let redirectedForStrategy = false;
    let redirectedForStall = false;
    structuredAssistantBlocks.push(...normalizeThinkingBlocks(modelTurn.thinkingBlocks));

    if (modelTurn.outputText) {
      structuredAssistantBlocks.push({
        type: "text",
        text: modelTurn.outputText
      });
    }

    if (!firstToolEvaluated && modelTurn.functionCalls.length > 0) {
      const firstCall = modelTurn.functionCalls[0];
      firstToolEvaluated = true;
      const matchedRecommendation = suggestedFirstTools.includes(firstCall.name);
      await emitEvent(onEvent, { type: "first_tool_strategy", chosenTool: firstCall.name, suggestedFirstTools, matchedRecommendation });
      await createTrace({
        kind: "first_tool_strategy",
        chosenTool: firstCall.name,
        suggestedFirstTools,
        matchedRecommendation
      });

      if (
        config.runtime.enforceSuggestedFirstTool &&
        suggestedFirstTools.length > 0 &&
        !matchedRecommendation
      ) {
        const guidance = [
          `Strategy notice: first tool "${firstCall.name}" is not in the suggested first tools set.`,
          `Suggested first tools: ${suggestedFirstTools.join(", ")}`,
          "Reconsider and choose one of the suggested aggregated tools first unless a narrower tool is strictly necessary."
        ].join("\n");

        conversation.push({
          role: "user",
          content: guidance
        });
        await emitEvent(onEvent, { type: "first_tool_strategy_redirect", chosenTool: firstCall.name, suggestedFirstTools, guidance });
        await createTrace({
          kind: "first_tool_strategy_redirect",
          chosenTool: firstCall.name,
          suggestedFirstTools
        });
        redirectedForStrategy = true;
      }
    }

    if (!redirectedForStrategy) {
      const execution = await executeFunctionCalls({
        functionCalls: modelTurn.functionCalls,
        toolRegistry,
        executeTool,
        config,
        onEvent,
        createTrace
      });

      structuredAssistantBlocks.push(...execution.toolUseBlocks);
      structuredToolResultBlocks.push(...execution.toolResultBlocks);
      toolSteps += execution.results.length;

      for (const result of execution.results) {
        const toolSignature = JSON.stringify({
          name: result.functionCall.name,
          arguments: result.functionCall.arguments || {},
          output: result.normalized
        });
        if (toolSignature === previousToolSignature) {
          repeatedToolCallStreak += 1;
        } else {
          previousToolSignature = toolSignature;
          repeatedToolCallStreak = 1;
        }

        if (repeatedToolCallStreak >= maxRepeatedToolCallStreak) {
          await emitEvent(onEvent, { type: "loop_stall_detected", toolName: result.functionCall.name, repeatedToolCallStreak, maxRepeatedToolCallStreak });
          await createTrace({
            kind: "loop_stall_detected",
            toolName: result.functionCall.name,
            repeatedToolCallStreak,
            maxRepeatedToolCallStreak
          });

          if (stallRedirectCount === 0) {
            pendingMessages = [
              {
                role: "user",
                content: [
                  `Loop guard: the same tool call "${result.functionCall.name}" has repeated ${repeatedToolCallStreak} times with no new progress.`,
                  "Do not repeat the same tool call again unless you can explain what new information it will produce.",
                  "If the task is already answerable, provide the final answer now. Otherwise choose a different tool or explain what is missing."
                ].join("\n")
              }
            ];
            stallRedirectCount += 1;
            await emitEvent(onEvent, { type: "loop_stall_redirect", toolName: result.functionCall.name, guidance: pendingMessages[0].content });
            redirectedForStall = true;
            break;
          }

          finalMessage = [
            `Stopped because the loop appeared stuck repeating tool "${result.functionCall.name}" without new progress.`,
            "The agent should now revise its termination conditions or choose a different tool path."
          ].join("\n");
          conversation.push({
            role: "assistant",
            content: finalMessage
          });
          await emitEvent(onEvent, { type: "loop_stopped", reason: "repeated_tool_call", toolName: result.functionCall.name, finalMessage });
          return {
            finalMessage,
            toolSteps,
            conversation,
          };
        }
      }
    }

    if (redirectedForStrategy || redirectedForStall) {
      continue;
    }

    if (structuredAssistantBlocks.length > 0) {
      conversation.push({
        role: "assistant",
        content: structuredAssistantBlocks
      });
    }
    if (structuredToolResultBlocks.length > 0) {
      conversation.push({
        role: "user",
        content: structuredToolResultBlocks
      });
    }

    const memoryMessages = await consumeMemoryPrefetchIfReady({
      memoryPrefetch,
      onEvent,
      createTrace
    });
    if (memoryMessages.length > 0) {
      conversation.push(...memoryMessages);
      continue;
    }

    const steeringMessages = await normalizeMessages(await getSteeringMessages());
    if (steeringMessages.length > 0) {
      pendingMessages = steeringMessages;
      continue;
    }

  }

  await emitEvent(onEvent, { type: "loop_end", finalMessage, toolSteps });
  return {
    finalMessage,
    toolSteps,
    conversation
  };
}


async function consumeMemoryPrefetchIfReady({ memoryPrefetch, onEvent, createTrace }) {
  if (!memoryPrefetch || memoryPrefetch.consumed || !memoryPrefetch.settled) {
    return [];
  }
  memoryPrefetch.consumed = true;
  const result = await memoryPrefetch.promise;
  const memories = Array.isArray(result?.memories) ? result.memories : [];
  if (memories.length === 0) {
    if (result?.error) {
      await createTrace({
        kind: "memory_context_prefetch_error",
        error: result.error
      });
    }
    return [];
  }

  const summary = memories.map((memory) => ({
    section: memory.section,
    title: memory.title,
    score: memory.score
  }));
  await emitEvent(onEvent, {
    type: "memory_context_injected",
    count: memories.length,
    memories: summary
  });
  await createTrace({
    kind: "memory_context_injected",
    count: memories.length,
    memories: summary
  });

  return [
    {
      role: "user",
      ephemeral: true,
      content: renderRelevantMemoryMessage(memories)
    }
  ];
}

function renderRelevantMemoryMessage(memories) {
  const lines = [
    "<relevant-memory>",
    "The harness selected these project memories as relevant to the user's latest query. Treat them as hints; verify current repository facts with tools when needed."
  ];
  for (const memory of memories) {
    const tags = memory.tags?.length ? ` [${memory.tags.join(", ")}]` : "";
    lines.push(`- (${memory.section}) ${singleLine(memory.content)}${tags}`);
  }
  lines.push("</relevant-memory>");
  return lines.join("\n");
}

function singleLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function executeFunctionCalls({ functionCalls, toolRegistry, executeTool, config, onEvent, createTrace }) {
  const batches = partitionFunctionCalls(functionCalls, toolRegistry);
  const results = [];
  const toolUseBlocks = [];
  const toolResultBlocks = [];

  for (const batch of batches) {
    await emitEvent(onEvent, {
      type: "tool_batch_start",
      mode: batch.concurrencySafe ? "parallel" : "serial",
      count: batch.calls.length,
      toolNames: batch.calls.map((call) => call.name)
    });
    await createTrace({
      kind: "tool_batch_start",
      mode: batch.concurrencySafe ? "parallel" : "serial",
      count: batch.calls.length,
      toolNames: batch.calls.map((call) => call.name)
    });

    const batchResults = batch.concurrencySafe
      ? await Promise.all(batch.calls.map((functionCall) => executeOneFunctionCall({
          functionCall,
          toolRegistry,
          executeTool,
          config,
          onEvent,
          createTrace
        })))
      : [];

    if (!batch.concurrencySafe) {
      for (const functionCall of batch.calls) {
        batchResults.push(await executeOneFunctionCall({
          functionCall,
          toolRegistry,
          executeTool,
          config,
          onEvent,
          createTrace
        }));
      }
    }

    for (const result of batchResults) {
      results.push(result);
      toolUseBlocks.push(result.toolUseBlock);
      toolResultBlocks.push(result.toolResultBlock);
    }

    await emitEvent(onEvent, {
      type: "tool_batch_end",
      mode: batch.concurrencySafe ? "parallel" : "serial",
      count: batch.calls.length,
      toolNames: batch.calls.map((call) => call.name)
    });
  }

  return { results, toolUseBlocks, toolResultBlocks };
}

function partitionFunctionCalls(functionCalls, toolRegistry) {
  const batches = [];
  for (const functionCall of functionCalls) {
    const concurrencySafe = isFunctionCallConcurrencySafe(functionCall, toolRegistry);
    const previous = batches[batches.length - 1];
    if (concurrencySafe && previous?.concurrencySafe) {
      previous.calls.push(functionCall);
    } else {
      batches.push({ concurrencySafe, calls: [functionCall] });
    }
  }
  return batches;
}

function isFunctionCallConcurrencySafe(functionCall, toolRegistry) {
  try {
    const tool = toolRegistry.get(functionCall.name);
    return Boolean(tool.isConcurrencySafe(functionCall.arguments || {}));
  } catch {
    return false;
  }
}

async function executeOneFunctionCall({ functionCall, toolRegistry, executeTool, config, onEvent, createTrace }) {
  const tool = toolRegistry.get(functionCall.name);
  const concurrencySafe = isFunctionCallConcurrencySafe(functionCall, toolRegistry);
  await emitEvent(onEvent, {
    type: "tool_call_start",
    toolName: functionCall.name,
    arguments: functionCall.arguments || {},
    riskLevel: tool.riskLevel || "safe",
    concurrencySafe
  });
  let normalized;
  let hadError = false;
  try {
    const result = await executeTool(functionCall.name, functionCall.arguments || {});
    hadError = result?.status === "error";
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

  const toolUseId = functionCall.callId || functionCall.id || `${functionCall.name}_${Date.now()}`;
  const toolUseBlock = {
    type: "tool_use",
    id: toolUseId,
    name: functionCall.name,
    input: functionCall.arguments || {}
  };
  const toolResultBlock = {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: normalized,
    is_error: hadError
  };

  await emitEvent(onEvent, {
    type: "tool_call_end",
    toolName: functionCall.name,
    arguments: functionCall.arguments || {},
    riskLevel: tool.riskLevel || "safe",
    concurrencySafe,
    hadError,
    output: normalized
  });
  await createTrace({
    kind: "tool_call",
    toolName: functionCall.name,
    arguments: functionCall.arguments || {},
    riskLevel: tool.riskLevel || "safe",
    concurrencySafe,
    blockedByPolicy: errorIsPolicyBlocked(normalized),
    hadError,
    output: normalized
  });

  return { functionCall, normalized, hadError, toolUseBlock, toolResultBlock, concurrencySafe };
}

function buildAssistantContent(thinkingBlocks, finalMessage) {
  const blocks = normalizeThinkingBlocks(thinkingBlocks);
  if (blocks.length === 0) {
    return finalMessage;
  }
  return [
    ...blocks,
    {
      type: "text",
      text: finalMessage
    }
  ];
}

function normalizeThinkingBlocks(blocks = []) {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks
    .filter((block) => block?.type === "thinking" || block?.type === "redacted_thinking" || block?.type === "thinking_summary")
    .map((block) => ({ ...block }));
}

async function emitEvent(onEvent, event) {
  if (!onEvent) {
    return;
  }
  await onEvent({
    timestamp: new Date().toISOString(),
    ...event
  });
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
    description: `${tool.description} [risk=${tool.riskLevel}${tool.requiresConfirmation ? ", confirmation" : ""}${tool.concurrencySafe ? ", concurrency-safe" : tool.concurrencyMode === "dynamic" ? ", dynamic-concurrency" : ""}${tool.readOnly ? ", read-only" : ""}]`,
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
