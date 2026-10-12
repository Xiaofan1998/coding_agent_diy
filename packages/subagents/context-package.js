export function buildSubagentContextPackage({
  objective,
  extraContext = "",
  allowedTools = [],
  goal,
  sessionContext = "",
  planItems = []
}) {
  return [
    `Subagent objective: ${objective}`,
    "",
    `Active goal: ${goal?.objective || "(none)"}`,
    sessionContext ? `Session context:\n${sessionContext}` : "Session context: use transcript/history tools if prior details are needed.",
    `Allowed tools: ${allowedTools.join(", ") || "(inherit default subagent tools)"}`,
    `Plan items: ${summarizePlan(planItems)}`,
    extraContext ? `Additional context:\n${extraContext}` : "",
    "",
    "Repository source snippets are not preloaded. Use search/read tools when repository contents are needed.",
    "",
    "Working rules:",
    "- Stay within the subagent objective.",
    "- Use tools to inspect files instead of relying on preloaded repository snippets.",
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
