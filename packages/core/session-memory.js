import fs from "node:fs/promises";
import path from "node:path";
import { compactTranscriptByToolPairs, sanitizeTranscriptMessages } from "./transcript-utils.js";

const SUMMARY_FILE = "summary.md";
const META_FILE = "metadata.json";
const DEFAULT_INIT_TOKENS = 10000;
const DEFAULT_UPDATE_TOKENS = 5000;
const DEFAULT_TOOL_CALLS = 3;
const DEFAULT_MAX_SUMMARY_CHARS = 12000;
const TOKEN_TO_CHAR_RATIO = 4;

export class SessionMemoryManager {
  constructor(config) {
    this.config = config;
    this.sessionMemoryDir = config.sessionMemoryDir || path.join(config.stateDir, "sessions", config.sessionId, "session-memory");
    this.summaryPath = path.join(this.sessionMemoryDir, SUMMARY_FILE);
    this.metaPath = path.join(this.sessionMemoryDir, META_FILE);
  }

  async loadSummary() {
    try {
      const content = await fs.readFile(this.summaryPath, "utf8");
      return content.trim() ? content : null;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async loadMetadata() {
    try {
      return JSON.parse(await fs.readFile(this.metaPath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return defaultMetadata();
      throw error;
    }
  }

  async saveMetadata(metadata) {
    await fs.mkdir(this.sessionMemoryDir, { recursive: true });
    await fs.writeFile(this.metaPath, JSON.stringify({ ...defaultMetadata(), ...metadata }, null, 2));
  }

  async maybeExtract({ transcriptMessages = [], createTrace = async () => {}, emitEvent = async () => {} } = {}) {
    if (!this.config.runtime.sessionMemoryEnabled) {
      return { extracted: false, reason: "disabled" };
    }
    if (!this.config.runtime.autoCompactEnabled) {
      return { extracted: false, reason: "auto_compact_disabled" };
    }

    const messages = normalizeTranscriptRows(transcriptMessages);
    if (messages.length === 0) {
      return { extracted: false, reason: "no_messages" };
    }

    const metadata = await this.loadMetadata();
    const currentTokens = estimateTokens(messages);
    const initTokens = positiveInteger(this.config.runtime.sessionMemoryInitTokens, DEFAULT_INIT_TOKENS);
    const updateTokens = positiveInteger(this.config.runtime.sessionMemoryUpdateTokens, DEFAULT_UPDATE_TOKENS);
    const toolThreshold = positiveInteger(this.config.runtime.sessionMemoryToolCallThreshold, DEFAULT_TOOL_CALLS);

    if (!metadata.initialized && currentTokens < initTokens) {
      return { extracted: false, reason: "below_init_threshold", currentTokens, initTokens };
    }

    const tokensSinceLastExtraction = currentTokens - Number(metadata.tokensAtLastExtraction || 0);
    const tokenThresholdMet = !metadata.initialized || tokensSinceLastExtraction >= updateTokens;
    if (!tokenThresholdMet) {
      return { extracted: false, reason: "below_update_threshold", currentTokens, tokensSinceLastExtraction, updateTokens };
    }

    const toolCallsSinceLast = countToolCallsAfterId(transcriptMessages, metadata.lastSummarizedMessageId);
    const hasToolCallThreshold = toolCallsSinceLast >= toolThreshold;
    const lastAssistantHasToolCalls = hasToolCallsInLastAssistantTurn(messages);
    const naturalBreak = !lastAssistantHasToolCalls;
    if (metadata.initialized && !hasToolCallThreshold && !naturalBreak) {
      return { extracted: false, reason: "awaiting_tool_or_break_threshold", toolCallsSinceLast, toolThreshold };
    }

    const lastMessage = transcriptMessages.at(-1);
    const summary = buildSessionSummary(messages, {
      maxSummaryChars: positiveInteger(this.config.runtime.sessionMemoryMaxSummaryChars, DEFAULT_MAX_SUMMARY_CHARS)
    });
    await fs.mkdir(this.sessionMemoryDir, { recursive: true });
    await fs.writeFile(this.summaryPath, summary);
    const nextMetadata = {
      initialized: true,
      updatedAt: new Date().toISOString(),
      lastSummarizedMessageId: lastMessage?.id || metadata.lastSummarizedMessageId || null,
      tokensAtLastExtraction: currentTokens,
      messageCountAtLastExtraction: transcriptMessages.length,
      toolCallsAtLastExtraction: Number(metadata.toolCallsAtLastExtraction || 0) + toolCallsSinceLast
    };
    await this.saveMetadata(nextMetadata);

    const event = {
      type: "session_memory_extracted",
      path: this.summaryPath,
      currentTokens,
      messageCount: transcriptMessages.length,
      lastSummarizedMessageId: nextMetadata.lastSummarizedMessageId
    };
    await emitEvent(event);
    await createTrace({ kind: "session_memory_extracted", ...event });
    return { extracted: true, summaryPath: this.summaryPath, metadata: nextMetadata };
  }

  async buildCompactMessages({ transcriptMessages = [], keepRecentMessages = 10, maxSummaryChars = 12000 } = {}) {
    const summary = await this.loadSummary();
    if (!summary || isEmptySessionSummary(summary)) {
      return null;
    }
    const metadata = await this.loadMetadata();
    const normalizedRows = normalizeTranscriptRows(transcriptMessages);
    if (normalizedRows.length === 0) {
      return null;
    }

    let boundaryIndex = -1;
    if (metadata.lastSummarizedMessageId) {
      boundaryIndex = transcriptMessages.findIndex((message) => message.id === metadata.lastSummarizedMessageId);
      if (boundaryIndex === -1) {
        return null;
      }
    } else {
      boundaryIndex = normalizedRows.length - 1;
    }

    const preferredStart = Math.max(0, boundaryIndex + 1, normalizedRows.length - keepRecentMessages);
    const adjustedStart = adjustStartForToolPairs(normalizedRows, preferredStart);
    const recentTail = sanitizeTranscriptMessages(normalizedRows.slice(adjustedStart));
    const compactSummary = renderCompactSummaryMessage({
      source: "session-memory",
      summary: clip(summary, maxSummaryChars),
      summaryPath: this.summaryPath,
      lastSummarizedMessageId: metadata.lastSummarizedMessageId || null,
      recentTailCount: recentTail.length
    });
    return {
      messages: [createCompactBoundaryMessage("session-memory"), compactSummary, ...recentTail],
      persistMessages: [createCompactBoundaryMessage("session-memory"), compactSummary],
      source: "session_memory",
      summaryPath: this.summaryPath,
      recentTailCount: recentTail.length
    };
  }
}

export function createCompactBoundaryMessage(source = "traditional") {
  return {
    role: "system",
    content: [
      "Conversation compacted.",
      `Compact source: ${source}.`,
      `Compacted at: ${new Date().toISOString()}.`
    ].join("\n")
  };
}

export function renderCompactSummaryMessage({ source, summary, summaryPath, lastSummarizedMessageId, recentTailCount }) {
  return {
    role: "user",
    content: [
      "<compact-summary>",
      `source: ${source}`,
      summaryPath ? `session_memory_path: ${summaryPath}` : null,
      lastSummarizedMessageId ? `last_summarized_message_id: ${lastSummarizedMessageId}` : null,
      Number.isFinite(recentTailCount) ? `recent_tail_messages: ${recentTailCount}` : null,
      "",
      summary,
      "</compact-summary>"
    ].filter(Boolean).join("\n")
  };
}

function buildSessionSummary(messages, { maxSummaryChars }) {
  const compacted = compactTranscriptByToolPairs(messages, {
    maxMessageChars: 3000,
    maxSummaryChars,
    includeThinkingText: false
  });
  return [
    "# Session Memory",
    "",
    `Updated: ${new Date().toISOString()}`,
    "",
    "This file is an automatically extracted summary of the current session. It is used for session-memory compact and is not durable project memory.",
    "",
    "## Summary",
    "",
    compacted
  ].join("\n");
}

function isEmptySessionSummary(summary) {
  const text = String(summary || "").replace(/[#\s\-_*`>]/g, "").trim();
  return text.length === 0;
}

function defaultMetadata() {
  return {
    initialized: false,
    updatedAt: null,
    lastSummarizedMessageId: null,
    tokensAtLastExtraction: 0,
    messageCountAtLastExtraction: 0,
    toolCallsAtLastExtraction: 0
  };
}

function normalizeTranscriptRows(messages) {
  return (messages || [])
    .filter((message) => message && typeof message.role === "string")
    .map((message) => ({ role: message.role, content: message.content ?? "", id: message.id }));
}

function estimateTokens(messages) {
  const chars = messages.reduce((sum, message) => sum + messageToText(message).length + 16, 0);
  return Math.ceil(chars / TOKEN_TO_CHAR_RATIO);
}

function countToolCallsAfterId(transcriptMessages, lastId) {
  return (transcriptMessages || [])
    .filter((message) => !lastId || Number(message.id || 0) > Number(lastId))
    .reduce((count, message) => count + getToolUseBlocks(message).length, 0);
}

function hasToolCallsInLastAssistantTurn(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "assistant") {
      return getToolUseBlocks(message).length > 0;
    }
    if (message.role === "user" && getToolResultBlocks(message).length === 0) {
      return false;
    }
  }
  return false;
}

function adjustStartForToolPairs(messages, preferredStart) {
  let start = Math.max(0, preferredStart);
  let changed = true;
  while (changed && start > 0) {
    changed = false;
    const recentResultIds = new Set();
    for (let index = start; index < messages.length; index += 1) {
      for (const block of getToolResultBlocks(messages[index])) {
        if (block.tool_use_id) recentResultIds.add(block.tool_use_id);
      }
    }
    for (let index = start - 1; index >= 0; index -= 1) {
      if (getToolUseBlocks(messages[index]).some((block) => recentResultIds.has(block.id))) {
        start = index;
        changed = true;
        break;
      }
    }
  }
  return start;
}

function getToolUseBlocks(message) {
  return asBlocks(message?.content).filter((block) => block?.type === "tool_use");
}

function getToolResultBlocks(message) {
  return asBlocks(message?.content).filter((block) => block?.type === "tool_result");
}

function asBlocks(content) {
  if (Array.isArray(content)) return content;
  if (typeof content === "string" && content) return [{ type: "text", text: content }];
  return [];
}

function messageToText(message) {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content.map((block) => {
    if (block?.type === "text") return block.text || "";
    if (block?.type === "tool_use") return `tool_use ${block.name || "tool"}: ${JSON.stringify(block.input || {})}`;
    if (block?.type === "tool_result") return `tool_result ${block.tool_use_id || ""}: ${typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "")}`;
    if (block?.type === "thinking" || block?.type === "thinking_summary" || block?.type === "redacted_thinking") return "[thinking]";
    return JSON.stringify(block || "");
  }).join("\n");
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function clip(value, maxChars) {
  const text = String(value || "");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 32))}\n... [session memory truncated]`;
}
