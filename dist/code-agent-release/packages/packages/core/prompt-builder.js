import fs from "node:fs/promises";
import path from "node:path";

const PROMPT_FILES = [
  "base.md",
  "coding.md",
  "tools.md",
  "skills.md",
  "goals.md",
  "memory.md",
  "formatting.md"
];

export async function buildSystemPrompt({ config, toolRegistry, session, goal, repoSnapshot, activatedSkills, dashboardSummary }) {
  const promptSections = [];

  for (const fileName of PROMPT_FILES) {
    const filePath = path.join(config.promptDir, fileName);
    promptSections.push(await fs.readFile(filePath, "utf8"));
  }

  promptSections.push(renderRuntimeContext(config, toolRegistry, session, goal, repoSnapshot, activatedSkills, dashboardSummary));
  promptSections.push(renderActionContract());

  return clampText(promptSections.join("\n\n"), config.runtime.maxPromptChars);
}

function renderRuntimeContext(config, toolRegistry, session, goal, repoSnapshot, activatedSkills, dashboardSummary) {
  const toolList = clampText(JSON.stringify(toolRegistry.list(), null, 2), 8000);
  const dashboardJson = clampText(JSON.stringify(dashboardSummary || {}), 4000);
  const repoContext = clampText(renderRepoContext(repoSnapshot), 12000);
  const activatedSkillBodies = clampText(
    activatedSkills.map(renderActivatedSkill).join("\n\n") || "(none)",
    12000
  );

  return [
    "## Runtime Context",
    `Suggested first tools: ${(dashboardSummary?.suggestedFirstTools || []).join(", ") || "(none)"}`,
    `Project root: ${repoSnapshot.projectRoot}`,
    `Workspace roots: ${(repoSnapshot.workspaceRoots || [repoSnapshot.projectRoot]).join(", ")}`,
    `Tool policy: max risk ${config.runtime.maxToolRisk}, subagent max risk ${config.runtime.subagentMaxToolRisk}`,
    `Top-level files: ${repoSnapshot.files.join(", ") || "(none)"}`,
    `Git repo: ${repoSnapshot.isGitRepo ? "yes" : "no"}`,
    `Git status summary: ${repoSnapshot.gitStatusSummary || "(none)"}`,
    `Sample source files: ${repoSnapshot.sourceFiles.join(", ") || "(none)"}`,
    `Relevant files: ${(repoSnapshot.relevantFiles || []).join(", ") || "(none)"}`,
    `Session summary: ${session.summary || "(empty)"}`,
    `Active goal: ${goal ? goal.objective : "(none)"}`,
    `Open approval requests: ${dashboardSummary?.openApprovalRequestCount || 0}`,
    `Active plan items: ${clampText(JSON.stringify(session.activePlanItems || []), 1200)}`,
    `Activated skills: ${activatedSkills.map((skill) => skill.name).join(", ") || "(none)"}`,
    ...renderDashboardHighlights(dashboardSummary),
    ...renderBundleIndexHighlights(dashboardSummary),
    `Dashboard summary: ${dashboardJson}`,
    "",
    "## Relevant Repo Context",
    repoContext,
    "Prefer aggregated state readers such as dashboard and bundle tools before reading many raw records.",
    "",
    "## Tool List",
    toolList,
    "",
    "## Activated Skill Bodies",
    activatedSkillBodies
  ].join("\n");
}

function renderDashboardHighlights(dashboardSummary) {
  if (!dashboardSummary) {
    return ["Dashboard highlights: (none)"];
  }

  return [
    `Dashboard highlights: plan ${dashboardSummary.completedPlanItemCount || 0}/${dashboardSummary.planItemCount || 0} completed, reviews ${dashboardSummary.reviewCount || 0}, workflows ${dashboardSummary.workflowRunCount || 0}, traces ${dashboardSummary.traceCount || 0}.`,
    `Current plan linkage: ${dashboardSummary.linkedSubagentCount || 0} linked subagent result(s), ${dashboardSummary.pendingSubagentReviewCount || 0} pending subagent review(s).`,
    `Open approvals: ${dashboardSummary.openApprovalRequestCount || 0}.`,
    `Latest workflow summary: ${dashboardSummary.latestWorkflowBundle ? `${dashboardSummary.latestWorkflowBundle.id} (${dashboardSummary.latestWorkflowBundle.status})` : "(none)"}`,
    `Recent workflow artifacts: ${(dashboardSummary.recentWorkflowArtifacts || []).map((item) => item.path).join(", ") || "(none)"}`,
    `Recent trace kinds: ${(dashboardSummary.recentTraceKinds || []).join(", ") || "(none)"}`,
    `Suggested first tools: ${(dashboardSummary.suggestedFirstTools || []).join(", ") || "(none)"}`,
    `Suggested next reads: ${(dashboardSummary.suggestedNextReads || []).map((item) => `${item.kind}:${item.id}`).join(", ") || "(none)"}`,
    `Current plan summary: ${clampText(JSON.stringify(dashboardSummary.currentPlanSummary || {}), 1200)}`,
    `First-tool strategy summary: ${dashboardSummary.firstToolStrategySummary ? `${dashboardSummary.firstToolStrategySummary.matched}/${dashboardSummary.firstToolStrategySummary.total} matched` : "(none)"}`
  ];
}

function renderBundleIndexHighlights(dashboardSummary) {
  if (!dashboardSummary) {
    return ["Bundle index highlights: (none)"];
  }

  return [
    `Bundle index highlights: recent workflows ${(dashboardSummary.recentWorkflowRuns || []).map((item) => item.id).join(", ") || "(none)"}.`,
    `Bundle index next reads: ${(dashboardSummary.suggestedNextReadLabels || []).join(", ") || "(none)"}`
  ];
}

function renderActionContract() {
  return [
    "## Tool And Output Contract",
    "Use provided function tools when you need to inspect files, update plans, run commands, or save state.",
    "When no more tools are needed, provide the final answer as concise Markdown text.",
    "",
    "Do not invent tool results.",
    "Do not output a synthetic JSON action protocol in plain text."
  ].join("\n");
}

function renderActivatedSkill(skill) {
  const supportSummary = skill.supportSummary
    ? `references=${skill.supportSummary.references}, scripts=${skill.supportSummary.scripts}, assets=${skill.supportSummary.assets}`
    : "references=0, scripts=0, assets=0";
  const embeddedFiles = (skill.embeddedSupportFiles || []).map((file) => {
    return [
      `#### ${file.relativePath}`,
      `Kind: ${file.kind}`,
      "",
      file.content
    ].join("\n");
  }).join("\n\n");
  const supportListing = (skill.supportFiles || []).map((file) => `- ${file.relativePath} (${file.kind}, ${file.size} bytes)`).join("\n") || "(none)";

  return [
    `### ${skill.name}`,
    `Source: ${skill.source}`,
    `Support files: ${supportSummary}`,
    "",
    skill.body,
    "",
    "#### Available Support Files",
    supportListing,
    embeddedFiles ? `\n#### Embedded Support Context\n${embeddedFiles}` : ""
  ].join("\n");
}

function renderRepoContext(repoSnapshot) {
  const lines = [
    `Context budget: files ${repoSnapshot.contextBudget?.maxRelevantFiles || 0}, snippet bytes ${repoSnapshot.contextBudget?.maxSnippetBytes || 0}`,
    `Relevant context summary: ${repoSnapshot.relevantContextSummary || "(none)"}`
  ];

  for (const entry of repoSnapshot.relevantContext || []) {
    lines.push(`### ${entry.path} (score ${entry.score})`);
    if (entry.toolPath && entry.toolPath !== entry.path) {
      lines.push(`Tool path: ${entry.toolPath}`);
    }
    lines.push(entry.snippet);
  }

  return lines.join("\n\n");
}

function clampText(text, maxChars) {
  if (!text || text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 32))}\n... [truncated for budget]`;
}
