export function renderArtifactDocument({ title, metadata = [], sections = [], notes = [] }) {
  return [
    `# ${title}`,
    "",
    ...metadata.map((item) => `- ${item}`),
    "",
    ...sections.flatMap((section) => renderSection(section)),
    "## Notes",
    ...notes.map((item) => `- ${item}`)
  ].join("\n");
}

export function formatListOrNone(items) {
  return items.length > 0 ? items.join(", ") : "(none)";
}

export function formatObjectFieldList(items, field) {
  return formatListOrNone(items.map((item) => item[field]).filter(Boolean));
}

export function formatWorkflowLabel(workflow) {
  return workflow ? `${workflow.id} (${workflow.status})` : "(none)";
}

export function renderWorkflowLinkedSummaryLines({
  linkedWorkflow,
  linkedWorkflowArtifacts = [],
  includePlanRun = true,
  includePlanArtifact = true,
  includeReviewCount = false,
  includeWorkflowArtifacts = true
}) {
  const lines = [];

  lines.push(
    linkedWorkflow
      ? `- Workflow: ${formatWorkflowLabel(linkedWorkflow)}`
      : "- Workflow: (none)"
  );

  if (includePlanRun) {
    lines.push(linkedWorkflow?.planRunId ? `- Plan run: ${linkedWorkflow.planRunId}` : "- Plan run: (none)");
  }

  if (includePlanArtifact) {
    lines.push(linkedWorkflow?.planArtifactId ? `- Plan artifact: ${linkedWorkflow.planArtifactId}` : "- Plan artifact: (none)");
  }

  if (includeReviewCount) {
    lines.push(linkedWorkflow ? `- Review count: ${(linkedWorkflow.reviewIds || []).length}` : "- Review count: (none)");
  }

  if (includeWorkflowArtifacts) {
    lines.push(`- Workflow artifact files: ${formatObjectFieldList(linkedWorkflowArtifacts || [], "path")}`);
  }

  return lines;
}

export function renderLatestWorkflowSummaryLine(workflow) {
  return workflow
    ? `- Latest workflow: ${formatWorkflowLabel(workflow)}`
    : "- Latest workflow: (none)";
}

export function renderLatestWorkflowBundleSummaryLine(workflow) {
  return workflow
    ? `- Latest workflow bundle: ${formatWorkflowLabel(workflow)}`
    : "- Latest workflow bundle: (none)";
}

export function renderLatestPlanRunSummaryLine(planRun) {
  return planRun
    ? `- Latest plan run: ${planRun.id} (${planRun.completedCount}/${planRun.totalCount} completed)`
    : "- Latest plan run: (none)";
}

export function renderRecentArtifactIdLine(label, items) {
  return `- Recent ${label} ids: ${formatObjectFieldList(items || [], "id")}`;
}

export function renderRecentArtifactPathLine(label, items) {
  return `- Recent ${label} paths: ${formatObjectFieldList(items || [], "path")}`;
}

export function renderArtifactCoverageLine(artifactCoverage) {
  return `- Missing artifacts: ${formatListOrNone(artifactCoverage?.missing || [])}`;
}

export function formatApprovalSummaryList(items) {
  if (!items || items.length === 0) {
    return "(none)";
  }
  return items
    .map((item) => `${item.id} (${item.status})${item.changeSummary ? ` ${item.changeSummary}` : ` ${item.title || ""}`}`.trim())
    .join(", ");
}

function renderSection(section) {
  return [
    `## ${section.title}`,
    ...(section.lines.length > 0 ? section.lines : ["- (none)"]),
    ""
  ];
}
