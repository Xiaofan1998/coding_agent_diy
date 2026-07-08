function truncate(text, maxChars) {
  if (!text) {
    return "";
  }
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 18))}... [truncated]`;
}

export function buildWorkingMemory({ conversation, goal, planItems = [], repoSnapshot, activatedSkills = [] }) {
  const recentTurns = conversation.slice(-8);
  const planSummary = summarizePlan(planItems);
  const recentUserRequests = recentTurns
    .filter((item) => item.role === "user" || item.role === "developer")
    .slice(-3)
    .map((item) => `- ${truncate(singleLine(item.content), 220)}`);
  const recentAssistantActions = recentTurns
    .filter((item) => item.role === "assistant")
    .slice(-3)
    .map((item) => `- ${truncate(singleLine(item.content), 220)}`);

  return [
    "## Working Memory",
    `Active goal: ${goal?.objective || "(none)"}`,
    `Plan progress: ${planSummary}`,
    `Relevant files: ${(repoSnapshot?.relevantFiles || []).join(", ") || "(none)"}`,
    `Activated skills: ${activatedSkills.map((skill) => skill.name).join(", ") || "(none)"}`,
    "",
    "### Recent user requests",
    recentUserRequests.join("\n") || "- (none)",
    "",
    "### Recent assistant actions",
    recentAssistantActions.join("\n") || "- (none)"
  ].join("\n").slice(0, 4000);
}

export function buildSubagentContextPackage({
  objective,
  extraContext = "",
  allowedTools = [],
  goal,
  sessionSummary = "",
  planItems = [],
  repoSnapshot
}) {
  const relevantContext = (repoSnapshot?.relevantContext || []).map((entry) => {
    return [
      `### ${entry.path} (score ${entry.score})`,
      entry.snippet
    ].join("\n");
  }).join("\n\n");

  return [
    `Subagent objective: ${objective}`,
    "",
    `Active goal: ${goal?.objective || "(none)"}`,
    `Session summary: ${sessionSummary || "(empty)"}`,
    `Allowed tools: ${allowedTools.join(", ") || "(inherit default subagent tools)"}`,
    `Plan items: ${summarizePlan(planItems)}`,
    `Relevant files: ${(repoSnapshot?.relevantFiles || []).join(", ") || "(none)"}`,
    extraContext ? `Additional context:\n${extraContext}` : "",
    "",
    "Relevant repo context:",
    relevantContext || "(none)",
    "",
    "Working rules:",
    "- Stay within the subagent objective.",
    "- Use the provided context before broad exploration.",
    "- Return a concise summary, findings, and any concrete edits or verification notes."
  ].filter(Boolean).join("\n\n");
}

function summarizePlan(planItems) {
  if (!planItems || planItems.length === 0) {
    return "(none)";
  }

  const completedCount = planItems.filter((item) => item.status === "completed" || item.status === "skipped").length;
  const inProgressCount = planItems.filter((item) => item.status === "in_progress").length;
  const blockedCount = planItems.filter((item) => item.status === "blocked").length;
  const pendingItems = planItems
    .filter((item) => item.status !== "completed" && item.status !== "skipped")
    .slice(0, 3)
    .map((item) => item.content);

  return `${completedCount}/${planItems.length} completed, ${inProgressCount} in_progress, ${blockedCount} blocked; next: ${pendingItems.join(" | ") || "(none)"}`;
}

function singleLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
