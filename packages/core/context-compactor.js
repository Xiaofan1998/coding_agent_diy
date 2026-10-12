import { compactTranscriptByToolPairs, sanitizeTranscriptMessages } from "./transcript-utils.js";
import { createCompactBoundaryMessage, renderCompactSummaryMessage } from "./session-memory.js";

const DEFAULT_TOKEN_TO_CHAR_RATIO = 4;
const DEFAULT_COMPACT_RATIO = 0.9;
const DEFAULT_KEEP_RECENT_MESSAGES = 10;
const DEFAULT_MAX_COMPACTED_CHARS = 6000;
const DEFAULT_MAX_MESSAGE_CHARS = 4000;
const DEFAULT_AUTOCOMPACT_BUFFER_TOKENS = 13000;
const DEFAULT_SUMMARY_OUTPUT_TOKENS = 20000;
const CLEARED_TOOL_RESULT = "[Old tool result content cleared by microcompact]";

export async function compactContext({
  systemPrompt = "",
  transcriptMessages = [],
  runtimeContextMessages = [],
  userTurnMessage,
  config,
  sessionMemoryManager = null,
  createTrace = async () => {},
  emitEvent = async () => {}
}) {
  const runtime = config.runtime || {};
  const history = sanitizeTranscriptMessages(transcriptMessages.map((message) => ({
    role: message.role,
    content: message.content ?? "",
    id: message.id
  })));
  const userMessage = userTurnMessage ? [userTurnMessage] : [];
  const rawConversation = [...history, ...runtimeContextMessages, ...userMessage];
  const beforeChars = estimateContextChars(systemPrompt, rawConversation);
  const thresholdChars = getAutoCompactThresholdChars(config);
  const maxContextChars = getEffectiveContextChars(config);

  if (!runtime.autoCompactEnabled || beforeChars < thresholdChars) {
    return {
      conversation: microcompactMessages(rawConversation, { config }).messages,
      compacted: false,
      source: null,
      beforeChars,
      afterChars: beforeChars,
      thresholdChars,
      maxContextChars,
      persistMessages: []
    };
  }

  const keepRecentMessages = normalizePositiveInteger(runtime.contextCompactKeepRecentMessages, DEFAULT_KEEP_RECENT_MESSAGES);
  const maxCompactedChars = normalizePositiveInteger(runtime.maxCompactedContextChars, DEFAULT_MAX_COMPACTED_CHARS);
  const maxMessageChars = normalizePositiveInteger(runtime.maxCompactedMessageChars, DEFAULT_MAX_MESSAGE_CHARS);

  if (sessionMemoryManager) {
    const sessionCompact = await sessionMemoryManager.buildCompactMessages({
      transcriptMessages,
      keepRecentMessages,
      maxSummaryChars: maxCompactedChars
    });
    if (sessionCompact) {
      const conversation = [
        ...sessionCompact.messages,
        ...runtimeContextMessages,
        ...userMessage
      ];
      const afterChars = estimateContextChars(systemPrompt, conversation);
      if (afterChars < thresholdChars) {
        const result = {
          conversation,
          compacted: true,
          source: "session_memory",
          beforeChars,
          afterChars,
          thresholdChars,
          maxContextChars,
          olderMessageCount: Math.max(0, history.length - sessionCompact.recentTailCount),
          recentMessageCount: sessionCompact.recentTailCount,
          persistMessages: sessionCompact.persistMessages,
          summaryPath: sessionCompact.summaryPath
        };
        await emitCompactEvent({ emitEvent, createTrace, result });
        return result;
      }
    }
  }

  const splitIndex = adjustSplitIndexForToolPairs(history, Math.max(0, history.length - keepRecentMessages));
  const older = history.slice(0, splitIndex);
  const recent = history.slice(splitIndex);
  const microcompactedOlder = microcompactMessages(older, { config, maxMessageChars }).messages;
  const microcompactedRecent = microcompactMessages(recent, { config, maxMessageChars }).messages;

  if (older.length === 0) {
    const conversation = [...microcompactedRecent, ...runtimeContextMessages, ...userMessage];
    const afterChars = estimateContextChars(systemPrompt, conversation);
    const result = {
      conversation,
      compacted: afterChars < beforeChars,
      source: resultSource(afterChars < beforeChars, "microcompact_only"),
      beforeChars,
      afterChars,
      thresholdChars,
      maxContextChars,
      olderMessageCount: 0,
      recentMessageCount: microcompactedRecent.length,
      persistMessages: []
    };
    if (result.compacted) await emitCompactEvent({ emitEvent, createTrace, result, eventType: "context_microcompact" });
    return result;
  }

  const summary = compactTranscriptByToolPairs(microcompactedOlder, {
    maxMessageChars,
    maxSummaryChars: maxCompactedChars,
    includeThinkingText: false
  });
  const summaryMessage = renderCompactSummaryMessage({
    source: "traditional",
    summary,
    recentTailCount: microcompactedRecent.length
  });
  const boundary = createCompactBoundaryMessage("traditional");
  const conversation = [boundary, summaryMessage, ...microcompactedRecent, ...runtimeContextMessages, ...userMessage];
  const afterChars = estimateContextChars(systemPrompt, conversation);
  const result = {
    conversation,
    compacted: true,
    source: "traditional",
    beforeChars,
    afterChars,
    thresholdChars,
    maxContextChars,
    olderMessageCount: older.length,
    recentMessageCount: microcompactedRecent.length,
    persistMessages: [boundary, summaryMessage]
  };
  await emitCompactEvent({ emitEvent, createTrace, result });
  return result;
}

export function microcompactMessages(messages = [], { config = {}, maxMessageChars } = {}) {
  const runtime = config.runtime || {};
  const limit = normalizePositiveInteger(maxMessageChars || runtime.maxCompactedMessageChars, DEFAULT_MAX_MESSAGE_CHARS);
  const sanitized = sanitizeTranscriptMessages(messages);
  let changed = false;
  const compacted = sanitized.map((message) => {
    const next = clearLargeToolResults(message, limit);
    if (next !== message) changed = true;
    return next;
  });
  return { messages: compacted, compacted: changed };
}

// Backward-compatible wrapper used by older smoke tests and callers. This now
// performs Claude-Code-style compact orchestration rather than treating
// microcompact as the owner of whole-history summaries.
export function microcompactContext({ systemPrompt = "", conversation = [], config, createTrace = async () => {} }) {
  const beforeChars = estimateContextChars(systemPrompt, conversation);
  const thresholdChars = getAutoCompactThresholdChars(config);
  const maxContextChars = getEffectiveContextChars(config);
  if (beforeChars < thresholdChars) {
    return { conversation, compacted: false, beforeChars, afterChars: beforeChars, thresholdChars, maxContextChars };
  }
  const maxMessageChars = normalizePositiveInteger(config.runtime?.maxCompactedMessageChars, DEFAULT_MAX_MESSAGE_CHARS);
  const keepRecentMessages = normalizePositiveInteger(config.runtime?.contextCompactKeepRecentMessages, DEFAULT_KEEP_RECENT_MESSAGES);
  const sanitized = sanitizeTranscriptMessages(conversation);
  const splitIndex = adjustSplitIndexForToolPairs(sanitized, Math.max(0, sanitized.length - keepRecentMessages));
  const older = sanitized.slice(0, splitIndex);
  const recent = microcompactMessages(sanitized.slice(splitIndex), { config, maxMessageChars }).messages;
  if (older.length === 0) {
    const afterChars = estimateContextChars(systemPrompt, recent);
    return { conversation: recent, compacted: afterChars < beforeChars, beforeChars, afterChars, thresholdChars, maxContextChars, olderMessageCount: 0, recentMessageCount: recent.length };
  }
  const summary = compactTranscriptByToolPairs(microcompactMessages(older, { config, maxMessageChars }).messages, {
    maxMessageChars,
    maxSummaryChars: normalizePositiveInteger(config.runtime?.maxCompactedContextChars, DEFAULT_MAX_COMPACTED_CHARS),
    includeThinkingText: false
  });
  const compactedConversation = [createCompactBoundaryMessage("traditional"), renderCompactSummaryMessage({ source: "traditional", summary, recentTailCount: recent.length }), ...recent];
  const afterChars = estimateContextChars(systemPrompt, compactedConversation);
  const result = { conversation: compactedConversation, compacted: true, beforeChars, afterChars, thresholdChars, maxContextChars, olderMessageCount: older.length, recentMessageCount: recent.length };
  void createTrace({ kind: "context_compact", ...result, conversation: undefined });
  return result;
}

export function estimateContextChars(systemPrompt, conversation = []) {
  return String(systemPrompt || "").length + conversation.reduce((sum, message) => sum + messageToText(message).length + 16, 0);
}

function getEffectiveContextChars(config = {}) {
  const runtime = config.runtime || {};
  const maxContextTokens = normalizePositiveInteger(runtime.maxContextTokens || config.openai?.maxTokens, 800000);
  const summaryOutputTokens = Math.min(normalizePositiveInteger(config.openai?.maxCompletionTokens, 32000), DEFAULT_SUMMARY_OUTPUT_TOKENS);
  const effectiveTokens = Math.max(1, maxContextTokens - summaryOutputTokens);
  return normalizePositiveInteger(runtime.maxContextChars, effectiveTokens * DEFAULT_TOKEN_TO_CHAR_RATIO);
}

function getAutoCompactThresholdChars(config = {}) {
  const runtime = config.runtime || {};
  const effectiveChars = getEffectiveContextChars(config);
  const bufferTokens = normalizePositiveInteger(runtime.autoCompactBufferTokens, DEFAULT_AUTOCOMPACT_BUFFER_TOKENS);
  const claudeStyleThreshold = effectiveChars - (bufferTokens * DEFAULT_TOKEN_TO_CHAR_RATIO);
  const ratio = normalizeRatio(runtime.contextCompactThresholdRatio, DEFAULT_COMPACT_RATIO);
  const ratioThreshold = Math.floor(effectiveChars * ratio);
  if (claudeStyleThreshold <= 0) {
    return Math.max(1, ratioThreshold);
  }
  return Math.max(1, Math.min(claudeStyleThreshold, ratioThreshold));
}

function clearLargeToolResults(message, maxChars) {
  if (!Array.isArray(message?.content)) {
    return message;
  }
  let changed = false;
  const content = message.content.map((block) => {
    if (block?.type !== "tool_result") {
      return block;
    }
    const text = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
    if (text.length <= maxChars) {
      return block;
    }
    changed = true;
    return {
      ...block,
      content: `${CLEARED_TOOL_RESULT}\nOriginal length: ${text.length} chars.`
    };
  });
  return changed ? { ...message, content } : message;
}

function adjustSplitIndexForToolPairs(conversation, preferredSplitIndex) {
  let splitIndex = preferredSplitIndex;
  let changed = true;
  while (changed && splitIndex > 0) {
    changed = false;
    const recentToolResultIds = new Set();
    for (let index = splitIndex; index < conversation.length; index += 1) {
      for (const block of getToolResultBlocks(conversation[index])) {
        if (block.tool_use_id) recentToolResultIds.add(block.tool_use_id);
      }
    }
    for (let index = splitIndex - 1; index >= 0; index -= 1) {
      const toolUseIds = getToolUseBlocks(conversation[index]).map((block) => block.id).filter(Boolean);
      if (toolUseIds.some((id) => recentToolResultIds.has(id))) {
        splitIndex = index;
        changed = true;
        break;
      }
    }
  }
  return splitIndex;
}

function getToolUseBlocks(message) {
  return blocksOf(message).filter((block) => block?.type === "tool_use");
}

function getToolResultBlocks(message) {
  return blocksOf(message).filter((block) => block?.type === "tool_result");
}

function blocksOf(message) {
  if (Array.isArray(message?.content)) return message.content;
  return [];
}

function messageToText(message) {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content.map((block) => {
      if (!block) return "";
      if (typeof block === "string") return block;
      if (block.type === "text") return block.text || "";
      if (block.type === "tool_use") return `tool_use ${block.name || "unknown"}: ${JSON.stringify(block.input || {})}`;
      if (block.type === "tool_result") return `tool_result ${block.tool_use_id || "unknown"}: ${block.content || ""}`;
      if (block.type === "thinking" || block.type === "redacted_thinking" || block.type === "thinking_summary") return block.text ? `thinking: ${block.text}` : `[${block.type}]`;
      return JSON.stringify(block);
    }).join("\n");
  }
  return JSON.stringify(message.content || "");
}

async function emitCompactEvent({ emitEvent, createTrace, result, eventType = "context_compact" }) {
  const payload = {
    type: eventType,
    beforeChars: result.beforeChars,
    afterChars: result.afterChars,
    thresholdChars: result.thresholdChars,
    maxContextChars: result.maxContextChars,
    olderMessageCount: result.olderMessageCount || 0,
    recentMessageCount: result.recentMessageCount || 0,
    source: result.source || null,
    summaryPath: result.summaryPath || null
  };
  await emitEvent(payload);
  await createTrace({ kind: eventType, ...payload });
}

function resultSource(condition, source) {
  return condition ? source : null;
}

function normalizeRatio(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) return fallback;
  return parsed;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}
