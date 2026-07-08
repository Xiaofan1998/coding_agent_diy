import fs from "node:fs/promises";
import crypto from "node:crypto";
import { buildArtifactLocation, getArtifactDir } from "../shared/artifact-paths.js";
import {
  formatApprovalSummaryList as formatApprovalSummaries,
  formatListOrNone,
  formatObjectFieldList,
  renderArtifactDocument,
  renderRecentArtifactIdLine,
  renderRecentArtifactPathLine
} from "../shared/artifact-render.js";

export class BundleIndexArtifactManager {
  constructor({ config, stateStore }) {
    this.config = config;
    this.stateStore = stateStore;
    this.artifactDir = getArtifactDir(config, "agent-bundles");
  }

  async exportBundleIndexArtifact({ title = "" } = {}) {
    const bundleIndex = await this.stateStore.getBundleIndexSummary();
    const workflowId = bundleIndex.dashboard?.latestWorkflowBundle?.id || null;
    const createdAt = new Date().toISOString();
    const safeTitle = slugify(title || "bundle-index").slice(0, 80) || "bundle-index";
    const timestamp = createdAt.replace(/[:]/g, "-").replace(/\..+$/, "");
    const { absolutePath, storedPath } = buildArtifactLocation(this.config, "agent-bundles", `${timestamp}-${safeTitle}.md`);

    await fs.mkdir(this.artifactDir, { recursive: true });
    await fs.writeFile(absolutePath, renderBundleIndexDocument({ bundleIndex, title, createdAt }), "utf8");

    const record = {
      id: `bundleartifact_${crypto.randomUUID()}`,
      createdAt,
      title: title || "bundle-index",
      path: storedPath,
      bundleIndex,
      workflowId
    };

    await this.stateStore.saveBundleIndexArtifact(record);
    return record;
  }
}

function renderBundleIndexDocument({ bundleIndex, title, createdAt }) {
  return renderArtifactDocument({
    title: title || "bundle-index",
    metadata: [
      `Generated at: ${createdAt}`,
      `Latest workflow: ${bundleIndex.dashboard?.latestWorkflowBundle?.id || "(none)"}`,
      `Active goal: ${bundleIndex.dashboard?.activeGoal?.objective || "(none)"}`
    ],
    sections: [
      {
        title: "Summary",
        lines: [
          `- Strategy mode: ${bundleIndex.dashboard?.strategyMode || "balanced"}`,
          `- Plan progress: ${bundleIndex.dashboard?.completedPlanItemCount || 0}/${bundleIndex.dashboard?.planItemCount || 0}`,
          `- Linked subagents: ${bundleIndex.dashboard?.linkedSubagentCount || 0}`,
          `- Pending subagent reviews: ${bundleIndex.dashboard?.pendingSubagentReviewCount || 0}`,
          `- Reviews: ${bundleIndex.dashboard?.reviewCount || 0}`,
          `- Open approvals: ${bundleIndex.dashboard?.openApprovalRequestCount || 0}`,
          `- Workflows: ${bundleIndex.dashboard?.workflowRunCount || 0}`,
          `- Traces: ${bundleIndex.dashboard?.traceCount || 0}`,
          `- Missing artifacts: ${formatListOrNone(bundleIndex.dashboard?.artifactCoverage?.missing || [])}`
        ]
      },
      {
        title: "Recent Bundles",
        lines: [
          ...(bundleIndex.workflowBundles || []).map((item) => `- workflow ${item.id} (${item.status}) reviews=${item.reviewCount} traces=${item.traceCount}`),
          ...(bundleIndex.reviewBundles || []).map((item) => `- review ${item.id} ${item.kind} ${item.status} workflow=${item.workflowId || "(none)"}`),
          ...(bundleIndex.traceBundles || []).map((item) => `- trace ${item.id} ${item.kind} workflow=${item.workflowId || "(none)"}`)
        ]
      },
      {
        title: "Suggested Reads",
        lines: [
          `- Suggested first tools: ${formatListOrNone(bundleIndex.dashboard?.suggestedFirstTools || [])}`,
          `- Suggested next reads: ${formatListOrNone(bundleIndex.dashboard?.suggestedNextReadLabels || [])}`,
          `- Recommended actions: ${formatListOrNone((bundleIndex.dashboard?.recommendedActions || []).map((item) => item.command ? `${item.label} [${item.command}]` : item.label))}`
        ]
      },
      {
        title: "Recent Artifacts",
        lines: [
          `- Recent approval summaries: ${formatApprovalSummaryList(bundleIndex.dashboard?.recentApprovalRequests || [])}`,
          renderRecentArtifactIdLine("approval artifact", bundleIndex.dashboard?.recentApprovalArtifacts || []),
          renderRecentArtifactPathLine("approval artifact", bundleIndex.dashboard?.recentApprovalArtifacts || []),
          renderRecentArtifactIdLine("dashboard artifact", bundleIndex.dashboard?.recentDashboardArtifacts || []),
          renderRecentArtifactPathLine("dashboard artifact", bundleIndex.dashboard?.recentDashboardArtifacts || []),
          renderRecentArtifactIdLine("bundle-index artifact", bundleIndex.dashboard?.recentBundleIndexArtifacts || []),
          renderRecentArtifactPathLine("bundle-index artifact", bundleIndex.dashboard?.recentBundleIndexArtifacts || []),
          renderRecentArtifactIdLine("plan artifact", bundleIndex.dashboard?.recentPlanArtifacts || []),
          renderRecentArtifactPathLine("plan artifact", bundleIndex.dashboard?.recentPlanArtifacts || []),
          renderRecentArtifactIdLine("review artifact", bundleIndex.dashboard?.recentReviewArtifacts || []),
          renderRecentArtifactPathLine("review artifact", bundleIndex.dashboard?.recentReviewArtifacts || []),
          renderRecentArtifactIdLine("workflow artifact", bundleIndex.dashboard?.recentWorkflowArtifacts || []),
          renderRecentArtifactPathLine("workflow artifact", bundleIndex.dashboard?.recentWorkflowArtifacts || []),
          renderRecentArtifactIdLine("trace artifact", bundleIndex.dashboard?.recentTraceArtifacts || []),
          renderRecentArtifactPathLine("trace artifact", bundleIndex.dashboard?.recentTraceArtifacts || [])
        ]
      }
    ],
    notes: [
      "This file was generated by the coding-agent bundle-index artifact exporter.",
      "Export a fresh bundle-index artifact when you need a compact snapshot across workflow, review, and trace bundles."
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
