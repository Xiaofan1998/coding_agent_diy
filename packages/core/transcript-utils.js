export function sanitizeTranscriptMessages(messages = []) {
  const normalized = normalizeMessages(messages);
  return stripTrailingThinkingFromLastAssistant(
    filterOrphanThinkingOnlyMessages(
      filterOrphanToolMessages(normalized)
    )
  );
}

export function compactTranscriptByToolPairs(messages = [], { maxMessageChars = 4000, maxSummaryChars = 6000, includeThinkingText = false } = {}) {
  const sanitized = sanitizeTranscriptMessages(messages);
  const units = groupTranscriptUnits(sanitized);
  const summaryLines = [
    `Compacted ${sanitized.length} older transcript message(s) into ${units.length} trajectory unit(s).`,
    "",
    "## Compacted transcript"
  ];

  for (const unit of units) {
    if (unit.type === "tool_pair") {
      summaryLines.push(formatToolPairUnit(unit, maxMessageChars, includeThinkingText));
      continue;
    }
    summaryLines.push(formatSingleMessageUnit(unit.messages[0], maxMessageChars, includeThinkingText));
  }

  let summary = summaryLines.join("\n");
  if (summary.length > maxSummaryChars) {
    summary = `${summary.slice(0, Math.max(0, maxSummaryChars - 42))}\n... [tool-aware compact summary truncated]`;
  }
  return summary;
}

function groupTranscriptUnits(messages) {
  const units = [];
  let index = 0;
  while (index < messages.length) {
    const message = messages[index];
    const toolUses = getToolUseBlocks(message);
    if (message?.role === "assistant" && toolUses.length > 0) {
      const resultMessages = [];
      const remainingToolIds = new Set(toolUses.map((block) => block.id).filter(Boolean));
      let cursor = index + 1;
      while (cursor < messages.length && remainingToolIds.size > 0) {
        const candidate = messages[cursor];
        const resultIds = getToolResultBlocks(candidate).map((block) => block.tool_use_id).filter(Boolean);
        const matched = resultIds.some((id) => remainingToolIds.has(id));
        if (!matched) {
          break;
        }
        resultMessages.push(candidate);
        for (const id of resultIds) {
          remainingToolIds.delete(id);
        }
        cursor += 1;
      }
      let followUpAssistant = null;
      if (cursor < messages.length && messages[cursor]?.role === "assistant" && getToolUseBlocks(messages[cursor]).length === 0) {
        followUpAssistant = messages[cursor];
        cursor += 1;
      }
      units.push({
        type: "tool_pair",
        messages: [message, ...resultMessages, ...(followUpAssistant ? [followUpAssistant] : [])],
        toolUses,
        resultMessages,
        followUpAssistant
      });
      index = cursor;
      continue;
    }
    units.push({ type: "message", messages: [message] });
    index += 1;
  }
  return units;
}

function filterOrphanToolMessages(messages) {
  const toolUseIds = new Set();
  const resolvedToolUseIds = new Set();
  for (const message of messages) {
    for (const block of getToolUseBlocks(message)) {
      if (block.id) toolUseIds.add(block.id);
    }
    for (const block of getToolResultBlocks(message)) {
      if (block.tool_use_id) resolvedToolUseIds.add(block.tool_use_id);
    }
  }

  return messages.flatMap((message) => {
    if (message?.role === "assistant") {
      const content = asBlocks(message.content);
      const toolUseBlocks = content.filter((block) => block?.type === "tool_use");
      if (toolUseBlocks.length === 0) {
        return [message];
      }
      const kept = content.filter((block) => block?.type !== "tool_use" || resolvedToolUseIds.has(block.id));
      return contentAfterFiltering(message, kept);
    }

    if (message?.role === "user") {
      const content = asBlocks(message.content);
      const resultBlocks = content.filter((block) => block?.type === "tool_result");
      if (resultBlocks.length === 0) {
        return [message];
      }
      const kept = content.filter((block) => block?.type !== "tool_result" || toolUseIds.has(block.tool_use_id));
      return contentAfterFiltering(message, kept);
    }

    return [message];
  });
}

function filterOrphanThinkingOnlyMessages(messages) {
  return messages.filter((message, index) => {
    if (message?.role !== "assistant") {
      return true;
    }
    const blocks = asBlocks(message.content);
    if (blocks.length === 0 || !blocks.every(isThinkingBlock)) {
      return true;
    }
    const previous = messages[index - 1];
    const next = messages[index + 1];
    return getToolResultBlocks(previous).length > 0 && next?.role === "assistant";
  });
}

function stripTrailingThinkingFromLastAssistant(messages) {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") {
    return messages;
  }
  const content = asBlocks(last.content);
  if (content.length === 0 || !isThinkingBlock(content.at(-1))) {
    return messages;
  }
  let lastValidIndex = content.length - 1;
  while (lastValidIndex >= 0 && isThinkingBlock(content[lastValidIndex])) {
    lastValidIndex -= 1;
  }
  const replacement = lastValidIndex < 0
    ? { ...last, content: "[No message content]" }
    : { ...last, content: content.slice(0, lastValidIndex + 1) };
  return [...messages.slice(0, -1), replacement];
}

function contentAfterFiltering(message, blocks) {
  if (blocks.length === 0) {
    return [];
  }
  if (blocks.length === 1 && blocks[0]?.type === "text") {
    return [{ ...message, content: blocks[0].text || "" }];
  }
  return [{ ...message, content: blocks }];
}

function formatToolPairUnit(unit, maxChars, includeThinkingText = false) {
  const toolLines = unit.toolUses.map((block) => {
    const result = findResultForTool(unit.resultMessages, block.id);
    return [
      `- tool_use ${block.name || "unknown"} (${block.id || "no-id"})`,
      `  input: ${clip(JSON.stringify(block.input || {}), Math.floor(maxChars / 3))}`,
      `  result: ${clip(result || "[missing result after orphan cleanup]", Math.floor(maxChars / 2))}`
    ].join("\n");
  });
  const followUp = unit.followUpAssistant ? `\n  follow-up assistant: ${clip(messageToText(unit.followUpAssistant, { includeThinkingText }), Math.floor(maxChars / 3))}` : "";
  return [`- tool trajectory:`, ...toolLines, followUp].filter(Boolean).join("\n");
}

function formatSingleMessageUnit(message, maxChars, includeThinkingText = false) {
  return `- ${message?.role || "unknown"}: ${clip(messageToText(message, { includeThinkingText }), maxChars)}`;
}

function findResultForTool(resultMessages, toolUseId) {
  for (const message of resultMessages) {
    const block = getToolResultBlocks(message).find((item) => item.tool_use_id === toolUseId);
    if (block) {
      return typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
    }
  }
  return "";
}

function normalizeMessages(messages) {
  return (messages || [])
    .filter((message) => message && typeof message === "object" && typeof message.role === "string")
    .map((message) => ({ role: message.role, content: message.content ?? "" }));
}

function getToolUseBlocks(message) {
  return asBlocks(message?.content).filter((block) => block?.type === "tool_use");
}

function getToolResultBlocks(message) {
  return asBlocks(message?.content).filter((block) => block?.type === "tool_result");
}

function asBlocks(content) {
  if (Array.isArray(content)) {
    return content;
  }
  if (typeof content === "string") {
    return content ? [{ type: "text", text: content }] : [];
  }
  return [];
}

function isThinkingBlock(block) {
  return block?.type === "thinking" || block?.type === "redacted_thinking" || block?.type === "thinking_summary";
}

function messageToText(message, { includeThinkingText = false } = {}) {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  return asBlocks(message.content).map((block) => {
    if (block.type === "text") return block.text || "";
    if (block.type === "tool_use") return `tool_use ${block.name || "unknown"}: ${JSON.stringify(block.input || {})}`;
    if (block.type === "tool_result") return `tool_result ${block.tool_use_id || "unknown"}: ${block.content || ""}`;
    if (isThinkingBlock(block)) {
      if (includeThinkingText && block.text) return `thinking: ${block.text}`;
      if (includeThinkingText && block.thinking) return `thinking: ${block.thinking}`;
      return `[${block.type} omitted from compact summary]`;
    }
    return JSON.stringify(block);
  }).join("\n");
}

function clip(value, maxChars) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 18))}... [truncated]`;
}
