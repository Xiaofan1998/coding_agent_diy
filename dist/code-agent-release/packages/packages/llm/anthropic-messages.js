export class AnthropicMessagesClient {
  constructor(config) {
    this.config = config;
    this.supportsResponseContinuation = false;
  }

  async createResponse({ instructions, conversationItems, toolDefinitions }) {
    if (!this.config.anthropic.authToken) {
      return {
        id: null,
        outputText: "ANTHROPIC_AUTH_TOKEN is not set. Configure it to enable Anthropic-compatible model turns.",
        functionCalls: []
      };
    }

    const timeoutMs = normalizeTimeout(this.config.anthropic.timeoutMs);
    const maxRetries = normalizeRetryCount(this.config.anthropic.maxRetries);
    const payload = {
      model: normalizeAnthropicModel(this.config.anthropic.model || this.config.openai.model),
      system: instructions,
      max_tokens: 4096,
      messages: normalizeMessages(conversationItems || []),
      tools: normalizeTools(toolDefinitions || [])
    };

    let response;
    let attemptCount = 0;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      attemptCount = attempt + 1;
      try {
        response = await executeRequest({
          url: `${this.config.anthropic.baseUrl.replace(/\/$/, "")}/v1/messages`,
          authToken: this.config.anthropic.authToken,
          payload,
          timeoutMs
        });
      } catch (error) {
        debugLog(this.config, `anthropic request attempt ${attemptCount} failed before HTTP response: ${error instanceof Error ? error.message : String(error)}`);
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
      debugLog(this.config, `anthropic request attempt ${attemptCount} returned HTTP ${response.status}`);
      if (attempt >= maxRetries || !shouldRetryStatus(response.status)) {
        throw error;
      }
      await delay(buildRetryDelayMs(attempt, response));
    }

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    const data = await response.json();
    const contentBlocks = Array.isArray(data.content) ? data.content : [];
    return {
      id: data.id || null,
      outputText: extractOutputText(contentBlocks),
      functionCalls: extractFunctionCalls(contentBlocks),
      rawOutput: contentBlocks,
      meta: {
        provider: "anthropic-messages",
        attemptCount,
        httpStatus: response.status,
        requestId: readRequestId(response),
        model: payload.model
      }
    };
  }
}

async function executeRequest({ url, authToken, payload, timeoutMs }) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(new Error(`Anthropic request timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": authToken,
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`Anthropic request timed out after ${timeoutMs}ms`);
    }
    const causeCode = error?.cause?.code || error?.code || "";
    const causeMessage = error?.cause?.message || error?.message || String(error);
    throw new Error(`Anthropic network request failed for ${url}${causeCode ? ` [${causeCode}]` : ""}: ${causeMessage}`);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function normalizeAnthropicModel(model) {
  return String(model || "").replace(/\[1m\]$/, "");
}

function normalizeMessages(conversationItems) {
  return conversationItems
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role,
      content: typeof item.content === "string"
        ? [{ type: "text", text: item.content }]
        : item.content
    }));
}

function normalizeTools(toolDefinitions) {
  return toolDefinitions
    .filter((tool) => tool.type === "function")
    .map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.parameters || { type: "object", properties: {}, additionalProperties: false }
    }));
}

function extractOutputText(contentBlocks) {
  return contentBlocks
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractFunctionCalls(contentBlocks) {
  return contentBlocks
    .filter((block) => block.type === "tool_use")
    .map((block) => ({
      id: block.id || null,
      callId: block.id || null,
      name: block.name,
      arguments: block.input || {}
    }));
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
  return new Error(`Anthropic request failed (${response.status}): ${body}`);
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
    || response?.headers?.get?.("anthropic-request-id")
    || null;
}

function debugLog(config, message) {
  if (!config?.runtime?.debug) {
    return;
  }
  console.error(`[code-agent][anthropic] ${message}`);
}
