import fs from "node:fs/promises";
import crypto from "node:crypto";
import { buildArtifactLocation, getArtifactDir } from "../shared/artifact-paths.js";
import {
  formatApprovalSummaryList as formatApprovalSummaries,
  formatListOrNone,
  formatObjectFieldList,
  formatWorkflowLabel,
  renderArtifactCoverageLine,
  renderArtifactDocument,
  renderRecentArtifactIdLine,
  renderRecentArtifactPathLine
} from "../shared/artifact-render.js";

export class DashboardArtifactManager {
  constructor({ config, stateStore }) {
    this.config = config;
    this.stateStore = stateStore;
    this.artifactDir = getArtifactDir(config, "agent-dashboard");
  }

  async exportDashboardArtifact({ title = "" } = {}) {
    const dashboard = await this.stateStore.getDashboardSummary();
    const workflowId = dashboard.latestWorkflowBundle?.id || null;
    const createdAt = new Date().toISOString();
    const safeTitle = slugify(title || "dashboard").slice(0, 80) || "dashboard";
    const timestamp = createdAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-dashboard", `${timestamp}-${safeTitle}.md`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, renderDashboardDocument({ dashboard, title, createdAt }), "utf8");

    const record = {
      id: `dashboardartifact_${crypto.randomUUID()}`,
      createdAt,
      title: title || "dashboard",
      path: storedPath,
      dashboardSummary: dashboard,
      workflowId
    };

    await this.stateStore.saveDashboardArtifact(record);
    return record;
  }
}

function renderDashboardDocument({ dashboard, title, createdAt }) {
  return renderArtifactDocument({
    title: title || "dashboard",
    metadata: [
      `Generated at: ${createdAt}`,
      `Active goal: ${dashboard.activeGoal?.objective || "(none)"}`,
      `Strategy mode: ${dashboard.strategyMode || "balanced"}`
    ],
    sections: [
      {
        title: "Summary",
        lines: [
          `- Plan progress: ${dashboard.completedPlanItemCount || 0}/${dashboard.planItemCount || 0}`,
          `- Strategy mode: ${dashboard.strategyMode || "balanced"}`,
          `- Linked subagents: ${dashboard.linkedSubagentCount || 0}`,
          `- Pending subagent reviews: ${dashboard.pendingSubagentReviewCount || 0}`,
          `- Reviews: ${dashboard.reviewCount || 0}`,
          `- Open approvals: ${dashboard.openApprovalRequestCount || 0}`,
          `- Governance summary: ${formatGovernanceSummary(dashboard.governanceSummary)}`,
          `- Workflows: ${dashboard.workflowRunCount || 0}`,
          `- Workflow artifacts: ${dashboard.workflowArtifactCount || 0}`,
          `- Traces: ${dashboard.traceCount || 0}`,
          `- Trace artifacts: ${dashboard.traceArtifactCount || 0}`,
          `- Latest workflow: ${formatWorkflowLabel(dashboard.latestWorkflowBundle)}`,
          `- Latest workflow reason codes: ${(dashboard.latestWorkflowBundle?.statusReasonCodes || []).join(", ") || "(none)"}`,
          renderArtifactCoverageLine(dashboard.artifactCoverage)
        ]
      },
      {
        title: "Recent Records",
        lines: [
          `- Plan artifacts: ${formatObjectFieldList(dashboard.recentPlanArtifacts || [], "path")}`,
          `- Review artifacts: ${formatObjectFieldList(dashboard.recentReviewArtifacts || [], "path")}`,
          `- Approval requests: ${formatApprovalSummaryList(dashboard.recentApprovalRequests || [])}`,
          `- Approval artifacts: ${formatObjectFieldList(dashboard.recentApprovalArtifacts || [], "path")}`,
          `- Dashboard artifacts: ${formatObjectFieldList(dashboard.recentDashboardArtifacts || [], "path")}`,
          `- Bundle-index artifacts: ${formatObjectFieldList(dashboard.recentBundleIndexArtifacts || [], "path")}`,
          `- Workflow artifacts: ${formatObjectFieldList(dashboard.recentWorkflowArtifacts || [], "path")}`,
          `- Trace kinds: ${formatListOrNone(dashboard.recentTraceKinds || [])}`,
          `- Suggested first tools: ${formatListOrNone(dashboard.suggestedFirstTools || [])}`,
          `- Suggested next reads: ${formatListOrNone(dashboard.suggestedNextReadLabels || [])}`,
          `- Recommended actions: ${formatListOrNone((dashboard.recommendedActions || []).map((item) => item.command ? `${item.label} [${item.command}]` : item.label))}`
        ]
      },
      {
        title: "Linked Summaries",
        lines: [
          dashboard.latestWorkflowBundle
            ? `- Latest workflow bundle: ${formatWorkflowLabel(dashboard.latestWorkflowBundle)}`
            : "- Latest workflow bundle: (none)",
          renderRecentArtifactIdLine("dashboard artifact", dashboard.recentDashboardArtifacts || []),
          renderRecentArtifactPathLine("dashboard artifact", dashboard.recentDashboardArtifacts || []),
          renderRecentArtifactIdLine("bundle-index artifact", dashboard.recentBundleIndexArtifacts || []),
          renderRecentArtifactPathLine("bundle-index artifact", dashboard.recentBundleIndexArtifacts || []),
          renderRecentArtifactIdLine("plan artifact", dashboard.recentPlanArtifacts || []),
          renderRecentArtifactIdLine("review artifact", dashboard.recentReviewArtifacts || []),
          renderRecentArtifactIdLine("workflow artifact", dashboard.recentWorkflowArtifacts || []),
          renderRecentArtifactPathLine("workflow artifact", dashboard.recentWorkflowArtifacts || []),
          renderRecentArtifactIdLine("approval artifact", dashboard.recentApprovalArtifacts || []),
          renderRecentArtifactPathLine("approval artifact", dashboard.recentApprovalArtifacts || []),
          renderRecentArtifactPathLine("dashboard artifact", dashboard.recentDashboardArtifacts || []),
          renderRecentArtifactPathLine("bundle-index artifact", dashboard.recentBundleIndexArtifacts || []),
          `- Recent approval summaries: ${formatApprovalSummaryList(dashboard.recentApprovalRequests || [])}`,
          renderRecentArtifactIdLine("trace artifact", dashboard.recentTraceArtifacts || []),
          renderRecentArtifactPathLine("trace artifact", dashboard.recentTraceArtifacts || [])
        ]
      }
    ],
    notes: [
      "This file was generated by the coding-agent dashboard artifact exporter.",
      "Export a fresh dashboard artifact when you need a point-in-time project state snapshot."
    ]
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatApprovalSummaryList(items) {
  return formatApprovalSummaries(items);
}

function formatGovernanceSummary(summary) {
  if (!summary) {
    return "(none)";
  }
  return [
    `openApprovals=${summary.openApprovalCount ?? 0}`,
    `hold=${summary.governanceHoldActive ? "yes" : "no"}`,
    `approvalPending=${summary.approvalPendingActive ? "yes" : "no"}`,
    `goalBlocked=${summary.goalBlockedActive ? "yes" : "no"}`,
    `latestWorkflowStatus=${summary.latestWorkflowStatus || "(none)"}`,
    `reasonCodes=${(summary.latestWorkflowReasonCodes || []).join(",") || "(none)"}`,
    `blocker=${summary.blockedGoalLastBlockerCode || "(none)"}`
  ].join(" ");
}
