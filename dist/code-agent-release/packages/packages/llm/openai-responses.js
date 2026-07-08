export class OpenAIResponsesClient {
  constructor(config) {
    this.config = config;
  }

  async createResponse({ instructions, conversationItems, toolDefinitions, previousResponseId, inputItems }) {
    if (!this.config.openai.apiKey) {
      return {
        id: null,
        outputText: "OPENAI_API_KEY is not set. Configure it to enable model-driven turns.",
        functionCalls: []
      };
    }

    const input = inputItems || normalizeConversationItems(conversationItems);
    const timeoutMs = normalizeTimeout(this.config.openai.timeoutMs);
    const maxRetries = normalizeRetryCount(this.config.openai.maxRetries);
    const payload = {
      model: this.config.openai.model,
      instructions,
      input,
      tools: toolDefinitions,
      parallel_tool_calls: false,
      previous_response_id: previousResponseId,
      store: true
    };

    let response;
    let attemptCount = 0;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      attemptCount = attempt + 1;
      try {
        response = await executeRequest({
          url: `${this.config.openai.baseUrl}/responses`,
          apiKey: this.config.openai.apiKey,
          payload,
          timeoutMs
        });
      } catch (error) {
        debugLog(this.config, `responses request attempt ${attemptCount} failed before HTTP response: ${error instanceof Error ? error.message : String(error)}`);
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
      debugLog(this.config, `responses request attempt ${attemptCount} returned HTTP ${response.status}`);
      if (attempt >= maxRetries || !shouldRetryStatus(response.status)) {
        throw error;
      }
      await delay(buildRetryDelayMs(attempt, response));
    }

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    const data = await response.json();
    const outputItems = Array.isArray(data.output) ? data.output : [];
    return {
      id: data.id || null,
      outputText: extractOutputText(data, outputItems),
      functionCalls: extractFunctionCalls(outputItems),
      rawOutput: outputItems,
      meta: {
        provider: "openai-responses",
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
  const timeoutHandle = setTimeout(() => controller.abort(new Error(`OpenAI request timed out after ${timeoutMs}ms`)), timeoutMs);
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
      throw new Error(`OpenAI request timed out after ${timeoutMs}ms`);
    }
    const causeCode = error?.cause?.code || error?.code || "";
    const causeMessage = error?.cause?.message || error?.message || String(error);
    throw new Error(`OpenAI network request failed for ${url}${causeCode ? ` [${causeCode}]` : ""}: ${causeMessage}`);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function normalizeConversationItems(conversationItems = []) {
  return conversationItems.map((item) => ({
    role: item.role,
    content: item.content
  }));
}

function extractOutputText(data, outputItems) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = [];
  walkOutputItems(outputItems, (item) => {
    if (item.type === "output_text" && typeof item.text === "string" && item.text.trim()) {
      chunks.push(item.text.trim());
      return;
    }
    if (item.type === "text" && typeof item.text === "string" && item.text.trim()) {
      chunks.push(item.text.trim());
    }
  });

  return chunks.join("\n").trim();
}

function extractFunctionCalls(outputItems) {
  const calls = [];
  walkOutputItems(outputItems, (item) => {
    if (item.type !== "function_call") {
      return;
    }
    calls.push({
      id: item.id || null,
      callId: item.call_id,
      name: item.name,
      arguments: safeParseArguments(item.arguments)
    });
  });
  return calls;
}

function walkOutputItems(outputItems, visitor) {
  for (const item of outputItems || []) {
    if (!item || typeof item !== "object") {
      continue;
    }
    visitor(item);
    if (Array.isArray(item.content)) {
      walkOutputItems(item.content, visitor);
    }
  }
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
  return new Error(`OpenAI request failed (${response.status}): ${body}`);
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
  console.error(`[code-agent][openai] ${message}`);
}
