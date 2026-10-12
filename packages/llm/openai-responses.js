export class OpenAIResponsesClient {
  constructor(config) {
    this.config = config;
    this.supportsResponseContinuation = false;
  }

  async createResponse({ instructions, conversationItems, toolDefinitions }) {
    if (!this.config.openai.apiKey) {
      return {
        id: null,
        outputText: "API_KEY is not set. Configure it to enable model-driven turns.",
        functionCalls: []
      };
    }

    const timeoutMs = normalizeTimeout(this.config.openai.timeoutMs);
    const maxRetries = normalizeRetryCount(this.config.openai.maxRetries);
    const payload = {
      model: this.config.openai.model,
      messages: normalizeMessages(instructions, conversationItems || []),
      tools: normalizeTools(toolDefinitions || []),
      stream: false,
      max_completion_tokens: normalizeMaxCompletionTokens(this.config.openai.maxCompletionTokens)
    };

    if (payload.tools.length === 0) {
      delete payload.tools;
    }

    let response;
    let attemptCount = 0;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      attemptCount = attempt + 1;
      try {
        response = await executeRequest({
          url: `${this.config.openai.baseUrl.replace(/\/$/, "")}/chat/completions`,
          apiKey: this.config.openai.apiKey,
          payload,
          timeoutMs
        });
      } catch (error) {
        debugLog(this.config, `chat completions request attempt ${attemptCount} failed before HTTP response: ${error instanceof Error ? error.message : String(error)}`);
        if (attempt >= maxRetries || !shouldRetryError(error)) {
          throw error;
        }
        await delay(buildRetryDelayMs(attempt));
        continue;
      }

      if (response.ok) {
        break;
      }

      const error = await buildHttpError(response);
      debugLog(this.config, `chat completions request attempt ${attemptCount} returned HTTP ${response.status}`);
      if (attempt >= maxRetries || !shouldRetryStatus(response.status)) {
        throw error;
      }
      await delay(buildRetryDelayMs(attempt, response));
    }

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message || {};
    return {
      id: data.id || null,
      outputText: typeof message.content === "string" ? message.content.trim() : "",
      functionCalls: extractFunctionCalls(message),
      thinkingBlocks: extractThinkingBlocks(message),
      rawOutput: data.choices || [],
      meta: {
        provider: "openai-chat-completions",
        attemptCount,
        httpStatus: response.status,
        requestId: readRequestId(response),
        model: this.config.openai.model
      }
    };
  }
}

async function executeRequest({ url, apiKey, payload, timeoutMs }) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(new Error(`OpenAI-compatible request timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`OpenAI-compatible request timed out after ${timeoutMs}ms`);
    }
    const causeCode = error?.cause?.code || error?.code || "";
    const causeMessage = error?.cause?.message || error?.message || String(error);
    throw new Error(`OpenAI-compatible network request failed for ${url}${causeCode ? ` [${causeCode}]` : ""}: ${causeMessage}`);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function normalizeMaxCompletionTokens(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 32000;
  }
  return Math.floor(parsed);
}

function normalizeMessages(instructions, conversationItems = []) {
  const messages = [];
  if (instructions) {
    messages.push({
      role: "system",
      content: instructions
    });
  }

  for (const item of conversationItems) {
    if (!item || typeof item !== "object") {
      continue;
    }
    if (typeof item.content === "string") {
      messages.push({
        role: normalizeRole(item.role),
        content: item.content
      });
      continue;
    }

    if (!Array.isArray(item.content)) {
      continue;
    }

    const textBlocks = item.content.filter((block) => block?.type === "text" && typeof block.text === "string");
    const toolUseBlocks = item.content.filter((block) => block?.type === "tool_use");
    const toolResultBlocks = item.content.filter((block) => block?.type === "tool_result");

    if (toolUseBlocks.length > 0) {
      messages.push({
        role: "assistant",
        content: textBlocks.map((block) => block.text).join("\n") || null,
        tool_calls: toolUseBlocks.map((block) => ({
          id: block.id,
          type: "function",
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input || {})
          }
        }))
      });
    } else if (textBlocks.length > 0) {
      messages.push({
        role: normalizeRole(item.role),
        content: textBlocks.map((block) => block.text).join("\n")
      });
    }

    for (const block of toolResultBlocks) {
      messages.push({
        role: "tool",
        tool_call_id: block.tool_use_id,
        content: typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "")
      });
    }
  }

  return messages;
}

function normalizeRole(role) {
  return role === "assistant" ? "assistant" : "user";
}

function normalizeTools(toolDefinitions) {
  return toolDefinitions
    .filter((tool) => tool.type === "function")
    .map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || "",
        parameters: tool.parameters || { type: "object", properties: {}, additionalProperties: false }
      }
    }));
}

function extractFunctionCalls(message) {
  return (message.tool_calls || [])
    .filter((toolCall) => toolCall?.type === "function" && toolCall.function?.name)
    .map((toolCall) => ({
      id: toolCall.id || null,
      callId: toolCall.id || null,
      name: toolCall.function.name,
      arguments: safeParseArguments(toolCall.function.arguments)
    }));
}

function extractThinkingBlocks(message) {
  const blocks = [];
  if (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) {
    blocks.push({
      type: "thinking_summary",
      text: message.reasoning_content.trim()
    });
  }
  if (typeof message.reasoning === "string" && message.reasoning.trim()) {
    blocks.push({
      type: "thinking_summary",
      text: message.reasoning.trim()
    });
  }
  return blocks;
}

function safeParseArguments(raw) {
  if (!raw) {
    return {};
  }
  if (typeof raw !== "string") {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeTimeout(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30000;
  }
  return parsed;
}

function normalizeRetryCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

async function buildHttpError(response) {
  const body = await response.text();
  return new Error(`OpenAI-compatible chat completions request failed (${response.status}): ${body}`);
}

function shouldRetryStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function shouldRetryError(error) {
  return isAbortError(error) || /timed out/i.test(String(error?.message || ""));
}

function buildRetryDelayMs(attempt, response = null) {
  const retryAfter = response?.headers?.get?.("retry-after");
  const retryAfterSeconds = Number(retryAfter);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1000;
  }
  return Math.min(4000, 250 * (2 ** attempt));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error) {
  return error?.name === "AbortError" || String(error?.message || "").includes("timed out");
}

function readRequestId(response) {
  return response?.headers?.get?.("x-request-id")
    || response?.headers?.get?.("openai-request-id")
    || null;
}

function debugLog(config, message) {
  if (!config?.runtime?.debug) {
    return;
  }
  console.error(`[code-agent][openai-chat] ${message}`);
}
