export function buildCompactSummaryPrompt({ scope = "conversation" } = {}) {
  const target = scope === "recent" ? "recent messages" : "conversation";
  return [
    "CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.",
    "",
    "Your task is to create a concise but technically complete summary of the conversation so far.",
    `Focus on the ${target}: user intent, concrete files/functions changed or inspected, decisions made, errors encountered, validation results, and pending next steps.`,
    "",
    "Your entire response must be plain text: an <analysis> block followed by a <summary> block.",
    "Use <analysis> as a private drafting scratchpad to check completeness. The caller will strip it before inserting the summary into future context.",
    "Do not invent tool results, file contents, or user preferences.",
    "",
    "<analysis>",
    "Check chronology, user requirements, code changes, validation, unresolved risks, and exact next step.",
    "</analysis>",
    "",
    "<summary>",
    "1. User intent and constraints:",
    "2. Relevant files and code paths:",
    "3. Decisions and implementation state:",
    "4. Tool results and validation:",
    "5. Pending work or next step:",
    "</summary>"
  ].join("\n");
}

export function formatCompactSummary(rawSummary = "") {
  let formatted = String(rawSummary || "");
  formatted = formatted.replace(/<analysis>[\s\S]*?<\/analysis>/i, "").trim();
  const summaryMatch = formatted.match(/<summary>([\s\S]*?)<\/summary>/i);
  if (summaryMatch) {
    return summaryMatch[1].trim();
  }
  return formatted
    .replace(/<\/?summary>/gi, "")
    .trim();
}
