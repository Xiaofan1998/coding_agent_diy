import { compactTranscriptByToolPairs, sanitizeTranscriptMessages } from "./transcript-utils.js";

const DEFAULT_TOKEN_TO_CHAR_RATIO = 4;
const DEFAULT_COMPACT_RATIO = 0.9;
const DEFAULT_KEEP_RECENT_MESSAGES = 10;
const DEFAULT_MAX_COMPACTED_CHARS = 6000;
const DEFAULT_MAX_MESSAGE_CHARS = 4000;

export function microcompactContext({
  systemPrompt = "",
  conversation = [],
  config,
  createTrace = async () => {}
}) {
  const runtime = config.runtime || {};
  const maxContextChars = runtime.maxContextChars || estimateMaxContextChars(config.openai?.model, runtime.maxContextTokens);
  const thresholdRatio = normalizeRatio(runtime.contextCompactThresholdRatio, DEFAULT_COMPACT_RATIO);
  const thresholdChars = Math.floor(maxContextChars * thresholdRatio);
  const beforeChars = estimateContextChars(systemPrompt, conversation);

  if (beforeChars < thresholdChars) {
    return {
      conversation,
      compacted: false,
      beforeChars,
      afterChars: beforeChars,
      thresholdChars,
      maxContextChars
    };
  }

  const keepRecentMessages = normalizePositiveInteger(runtime.contextCompactKeepRecentMessages, DEFAULT_KEEP_RECENT_MESSAGES);
  const maxCompactedChars = normalizePositiveInteger(runtime.maxCompactedContextChars, DEFAULT_MAX_COMPACTED_CHARS);
  const maxMessageChars = normalizePositiveInteger(runtime.maxCompactedMessageChars, DEFAULT_MAX_MESSAGE_CHARS);
  const sanitizedConversation = sanitizeTranscriptMessages(conversation);
  const preferredSplitIndex = Math.max(0, sanitizedConversation.length - keepRecentMessages);
  const splitIndex = adjustSplitIndexForToolPairs(sanitizedConversation, preferredSplitIndex);
  const older = sanitizedConversation.slice(0, splitIndex);
  const recent = sanitizedConversation.slice(splitIndex).map((message) => compactLargeMessage(message, maxMessageChars));

  if (older.length === 0) {
    const compactedOnly = recent;
    const afterChars = estimateContextChars(systemPrompt, compactedOnly);
    const result = {
      conversation: compactedOnly,
      compacted: afterChars < beforeChars,
      beforeChars,
      afterChars,
      thresholdChars,
      maxContextChars,
      olderMessageCount: 0,
      recentMessageCount: recent.length
    };
    if (result.compacted) {
      void createTrace({ kind: "context_microcompact", ...result, conversation: undefined });
    }
    return result;
  }

  const summary = compactTranscriptByToolPairs(older, {
    maxMessageChars,
    maxSummaryChars: maxCompactedChars,
    includeThinkingText: false
  });
  const compactedConversation = [
    {
      role: "developer",
      content: [
        "Context microcompact boundary: older conversation messages were folded to stay within the model context budget.",
        "Use this summary as continuity context; old tool_use/tool_result pairs were compacted together to avoid orphaned tool messages.",
        "Thinking blocks are handled by transcript preprocessing and are marked only as omitted metadata in this compact summary.",
        "",
        summary
      ].join("\n")
    },
    ...recent
  ];
  const afterChars = estimateContextChars(systemPrompt, compactedConversation);
  const result = {
    conversation: compactedConversation,
    compacted: true,
    beforeChars,
    afterChars,
    thresholdChars,
    maxContextChars,
    olderMessageCount: older.length,
    recentMessageCount: recent.length
  };
  void createTrace({ kind: "context_microcompact", ...result, conversation: undefined });
  return result;
}

export function estimateContextChars(systemPrompt, conversation = []) {
  return String(systemPrompt || "").length + conversation.reduce((sum, message) => sum + messageToText(message).length + 16, 0);
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

    const olderToolUseIds = new Set();
    for (let index = 0; index < splitIndex; index += 1) {
      for (const block of getToolUseBlocks(conversation[index])) {
        if (block.id) olderToolUseIds.add(block.id);
      }
    }
    const firstRecent = conversation[splitIndex];
    if (getToolResultBlocks(firstRecent).some((block) => olderToolUseIds.has(block.tool_use_id))) {
      for (let index = splitIndex - 1; index >= 0; index -= 1) {
        const toolUseIds = getToolUseBlocks(conversation[index]).map((block) => block.id).filter(Boolean);
        if (toolUseIds.some((id) => getToolResultBlocks(firstRecent).some((block) => block.tool_use_id === id))) {
          splitIndex = index;
          changed = true;
          break;
        }
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

function compactLargeMessage(message, maxChars) {
  const text = messageToText(message);
  if (text.length <= maxChars) {
    return message;
  }
  if (Array.isArray(message?.content)) {
    return {
      ...message,
      content: message.content.map((block) => {
        if (block?.type === "tool_result") {
          const content = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
          return {
            ...block,
            content: `${content.slice(0, Math.max(0, maxChars - 80))}\n... [tool_result truncated by context microcompact]`
          };
        }
        if (block?.type === "text" && typeof block.text === "string") {
          return {
            ...block,
            text: `${block.text.slice(0, Math.max(0, maxChars - 80))}\n... [text truncated by context microcompact]`
          };
        }
        if ((block?.type === "thinking" || block?.type === "thinking_summary") && typeof block.text === "string") {
          return {
            ...block,
            text: `${block.text.slice(0, Math.max(0, maxChars - 80))}\n... [thinking truncated by context microcompact]`
          };
        }
        return block;
      })
    };
  }
  return {
    ...message,
    content: `${text.slice(0, Math.max(0, maxChars - 64))}\n... [message truncated by context microcompact; see traces/history]`
  };
}

function messageToText(message) {
  if (!message) {
    return "";
  }
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content.map((block) => {
      if (!block) {
        return "";
      }
      if (typeof block === "string") {
        return block;
      }
      if (block.type === "text") {
        return block.text || "";
      }
      if (block.type === "tool_use") {
        return `tool_use ${block.name || "unknown"}: ${JSON.stringify(block.input || {})}`;
      }
      if (block.type === "tool_result") {
        return `tool_result ${block.tool_use_id || "unknown"}: ${block.content || ""}`;
      }
      if (block.type === "thinking" || block.type === "redacted_thinking" || block.type === "thinking_summary") {
        return block.text ? `thinking: ${block.text}` : `[${block.type}]`;
      }
      return JSON.stringify(block);
    }).join("\n");
  }
  return JSON.stringify(message.content || "");
}

function estimateMaxContextChars(model = "", maxContextTokens = 0) {
  const configuredTokens = Number(maxContextTokens);
  if (Number.isFinite(configuredTokens) && configuredTokens > 0) {
    return Math.floor(configuredTokens * DEFAULT_TOKEN_TO_CHAR_RATIO);
  }
  const match = String(model || "").match(/(\d+)k/i);
  if (match) {
    return Number(match[1]) * 1000 * DEFAULT_TOKEN_TO_CHAR_RATIO;
  }
  return 800000 * DEFAULT_TOKEN_TO_CHAR_RATIO;
}

function normalizeRatio(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric >= 1) {
    return fallback;
  }
  return numeric;
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function singleLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
