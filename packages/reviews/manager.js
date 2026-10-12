import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { summarizeGitStatus } from "../context/repo-context.js";
import { resolveArtifactRecordPath } from "../shared/artifact-paths.js";

const execFileAsync = promisify(execFile);

export class ReviewManager {
  constructor({ stateStore, config }) {
    this.stateStore = stateStore;
    this.config = config;
  }

  async runPlanReview() {
    const planItems = await this.stateStore.getPlanItems();
    const artifacts = await this.stateStore.listPlanArtifacts();
    const planRuns = await this.stateStore.listPlanRuns();
    const findings = [];

    if (planItems.length === 0) {
      findings.push("No active plan exists.");
    }

    const incomplete = planItems.filter((item) => item.status !== "completed" && item.status !== "skipped");
    if (incomplete.length > 0) {
      findings.push(`There are ${incomplete.length} incomplete plan items.`);
    }

    if (artifacts.length === 0) {
      findings.push("No exported plan artifact exists.");
    } else {
      findings.push(`Latest plan artifact: ${artifacts[0].path}`);
    }

    if (planRuns.length === 0) {
      findings.push("No plan execution run has been recorded yet.");
    } else {
      findings.push(`Latest plan run recorded ${planRuns[0].completedCount}/${planRuns[0].totalCount} completed items.`);
      if (planRuns[0].governanceHold) {
        findings.push(`Latest plan run is under governance hold due to pending approvals: ${(planRuns[0].approvalRequestIds || []).join(", ") || "(none)"}.`);
      }
      findings.push(...summarizeWorkspaceDiff(planRuns[0].workspaceDiff));
    }

    const blockingFindings = findings.filter((entry) => {
      return (
        entry.startsWith("No active") ||
        entry.startsWith("There are") ||
        entry.startsWith("No exported plan artifact") ||
        entry.startsWith("No plan execution") ||
        entry.startsWith("Latest plan run is under governance hold")
      );
    });

    const summary = blockingFindings.length === 0
      ? "Plan review passed. All plan items are completed or intentionally skipped."
      : `Plan review found ${blockingFindings.length} blocking issue(s).`;

    const record = {
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "plan",
      target: "active-plan",
      status: blockingFindings.length === 0 ? "approved" : "needs_attention",
      summary,
      findings
    };

    await this.stateStore.saveReview(record);
    return record;
  }

  async runSubagentReview() {
    const records = await this.stateStore.listSubagentRecords();
    const planRuns = await this.stateStore.listPlanRuns();
    const findings = [];

    if (records.length === 0) {
      findings.push("No subagent runs have been recorded.");
    }

    const weakRecords = records.filter((record) => {
      const message = record.result?.message || "";
      return message.includes("lightweight inspection") || message.includes("not reason as deeply");
    });

    if (weakRecords.length > 0) {
      findings.push(`${weakRecords.length} subagent result(s) are lightweight fallback summaries and may need deeper review.`);
    }

    if (planRuns.length > 0) {
      findings.push(`Latest plan run id: ${planRuns[0].id}`);
    }

    const blockingFindings = findings.filter((entry) => {
      return entry.startsWith("No subagent") || entry.includes("may need deeper review");
    });

    const summary = blockingFindings.length === 0
      ? "Subagent review passed. Existing records look acceptable."
      : `Subagent review found ${blockingFindings.length} blocking issue(s).`;

    const record = {
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "subagents",
      target: "subagent-records",
      status: blockingFindings.length === 0 ? "approved" : "needs_attention",
      summary,
      findings
    };

    await this.stateStore.saveReview(record);
    return record;
  }

  async runSessionReview() {
    const session = await this.stateStore.getSession();
    const artifacts = await this.stateStore.listPlanArtifacts();
    const findings = [];

    if ((session.transcriptMessages || []).length === 0) {
      findings.push("No transcript messages have been recorded.");
    }

    findings.push(`Recent transcript turn count: ${session.transcriptTurnCount || 0}`);
    findings.push(`Exported plan artifacts: ${artifacts.length}`);

    const blockingFindings = findings.filter((entry) => entry.startsWith("No transcript messages"));

    const summary = blockingFindings.length === 0
      ? "Session review passed. Transcript history is present."
      : `Session review found ${blockingFindings.length} blocking issue(s).`;

    const record = {
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "session",
      target: "current-session",
      status: blockingFindings.length === 0 ? "approved" : "needs_attention",
      summary,
      findings
    };

    await this.stateStore.saveReview(record);
    return record;
  }

  async runRepoReview() {
    const artifacts = await this.stateStore.listPlanArtifacts();
    const dashboardArtifacts = await this.stateStore.listDashboardArtifacts();
    const bundleIndexArtifacts = await this.stateStore.listBundleIndexArtifacts();
    const planRuns = await this.stateStore.listPlanRuns();
    const snapshots = await this.stateStore.listWorkspaceSnapshots();
    const findings = [];
    const fileChecks = await inspectKeyFiles(this.config.projectRoot);
    const gitSummary = await inspectGitState(this.config.projectRoot);

    if (artifacts.length === 0) {
      findings.push("No plan artifact has been exported.");
    } else {
      findings.push(`Latest exported plan artifact: ${artifacts[0].path}`);
      const artifactCheck = await inspectArtifact(resolveArtifactRecordPath(this.config, artifacts[0].path));
      findings.push(...artifactCheck);
    }

    if (dashboardArtifacts.length === 0) {
      findings.push("No dashboard artifact has been exported.");
    }

    if (bundleIndexArtifacts.length === 0) {
      findings.push("No bundle-index artifact has been exported.");
    }

    findings.push(`Project root reviewed: ${this.config.projectRoot}`);
    findings.push(...fileChecks);
    findings.push(...gitSummary);
    findings.push(...summarizeWorkspaceSnapshots(snapshots));
    if (planRuns[0]?.workspaceDiff) {
      findings.push(...summarizeWorkspaceDiff(planRuns[0].workspaceDiff));
    }

    const blockingFindings = findings.filter((entry) => {
      return (
        entry.startsWith("No plan artifact") ||
        entry.startsWith("No dashboard artifact") ||
        entry.startsWith("No bundle-index artifact") ||
        entry.startsWith("Missing key file")
      );
    });
    const summary = blockingFindings.length === 0
      ? "Repo review passed. Planning artifacts exist in the project workspace."
      : `Repo review found ${blockingFindings.length} blocking issue(s).`;

    const record = {
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "repo",
      target: "workspace-artifacts",
      status: blockingFindings.length === 0 ? "approved" : "needs_attention",
      summary,
      findings
    };

    await this.stateStore.saveReview(record);
    return record;
  }

  async runCodeReview() {
    const findings = [];
    const planRuns = await this.stateStore.listPlanRuns();
    const snapshots = await this.stateStore.listWorkspaceSnapshots();
    const checks = await Promise.all([
      inspectFileForPatterns(this.config.projectRoot, "packages/memory/state-store.js", ["DatabaseSync", "CREATE TABLE IF NOT EXISTS sessions", "CREATE TABLE IF NOT EXISTS reviews"]),
      inspectFileForPatterns(this.config.projectRoot, "packages/core/runtime.js", ["OpenAIResponsesClient", "LocalFallbackAgent", "createStateTools", "buildRepoSnapshot"]),
      inspectFileForPatterns(this.config.projectRoot, "packages/tools/state-tools.js", ["run_review", "export_plan_artifact", "list_plan_artifacts"]),
      inspectFileForPatterns(this.config.projectRoot, "packages/plans/manager.js", ["exportActivePlan", "createSuggestedPlan", "## Plan Items"]),
      inspectFileForPatterns(this.config.projectRoot, "packages/reviews/manager.js", ["runRepoReview", "runCodeReview", "inspectArtifact"]),
      inspectFileForPatterns(this.config.projectRoot, "apps/cli/index.js", ["handlePlanArtifactsCommand", "handleReviewsCommand", "runNamedReview"])
    ]);
    const snippetChecks = await Promise.all([
      inspectFileSnippet(this.config.projectRoot, "packages/core/runtime.js", "static async create", 18),
      inspectFileSnippet(this.config.projectRoot, "packages/tools/state-tools.js", "name: \"run_review\"", 18),
      inspectFileSnippet(this.config.projectRoot, "apps/cli/index.js", "async function handleReviewsCommand", 20)
    ]);
    const gitSummary = await inspectGitState(this.config.projectRoot);

    findings.push(...checks.flat());
    findings.push(...snippetChecks.flat());
    findings.push(...gitSummary);
    findings.push(...summarizeWorkspaceSnapshots(snapshots));
    if (planRuns[0]?.workspaceDiff) {
      findings.push(...summarizeWorkspaceDiff(planRuns[0].workspaceDiff));
    }

    const blockingFindings = findings.filter((entry) => entry.startsWith("Missing pattern") || entry.startsWith("Missing file"));
    const summary = blockingFindings.length === 0
      ? "Code review passed. Key coding-agent modules contain the expected integration points."
      : `Code review found ${blockingFindings.length} blocking issue(s).`;

    const record = {
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "code",
      target: "key-source-files",
      status: blockingFindings.length === 0 ? "approved" : "needs_attention",
      summary,
      findings
    };

    await this.stateStore.saveReview(record);
    return record;
  }

  async runStrategyReview() {
    const traces = await this.stateStore.listTraces(200);
    const dashboard = await this.stateStore.getDashboardSummary();
    const checks = traces.filter((trace) => trace.kind === "first_tool_strategy");
    const redirects = traces.filter((trace) => trace.kind === "first_tool_strategy_redirect");
    const findings = [];

    if (checks.length === 0) {
      findings.push("No first-tool strategy traces have been recorded yet.");
    } else {
      const mismatches = checks.filter((trace) => !trace.matchedRecommendation);
      findings.push(`Recorded ${checks.length} first-tool strategy checks.`);
      findings.push(`${mismatches.length} check(s) did not match the suggested first tools.`);
      findings.push(`${redirects.length} strategy redirect event(s) were recorded.`);
      if (checks[0]) {
        findings.push(`Latest chosen first tool: ${checks[0].chosenTool}`);
      }
    }

    if (dashboard.artifactCoverage?.missing?.length) {
      findings.push(`Missing artifact coverage: ${dashboard.artifactCoverage.missing.join(", ")}`);
    }

    const blockingFindings = findings.filter((entry) => {
      return entry.startsWith("No first-tool") || entry.includes("did not match");
    });

    const summary = blockingFindings.length === 0
      ? "Strategy review passed. First-tool choices matched the suggested aggregated tools."
      : `Strategy review found ${blockingFindings.length} blocking issue(s).`;

    const record = {
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "strategy",
      target: "first-tool-strategy",
      status: blockingFindings.length === 0 ? "approved" : "needs_attention",
      summary,
      findings
    };

    await this.stateStore.saveReview(record);
    return record;
  }

  async runApprovalReview() {
    const approvals = await this.stateStore.listApprovalRequests();
    const approvalArtifacts = await this.stateStore.listApprovalArtifacts();
    const planRuns = await this.stateStore.listPlanRuns();
    const workflows = await this.stateStore.listWorkflowRuns();
    const findings = [];

    if (approvals.length === 0) {
      findings.push("No approval requests have been recorded.");
    } else {
      const pending = approvals.filter((item) => item.status === "pending");
      const approvedWithoutRetry = approvals.filter((item) => {
        return item.kind === "tool_policy_gate" && item.status === "approved" && !item.lastRetriedAt;
      });
      findings.push(`Recorded ${approvals.length} approval request(s).`);
      findings.push(`${pending.length} approval request(s) are still pending.`);
      findings.push(`${approvedWithoutRetry.length} approved tool policy gate(s) have not been retried yet.`);
      if (approvals[0]) {
        findings.push(`Latest approval: ${approvals[0].id} (${approvals[0].status})`);
        if (approvals[0].changeSummary) {
          findings.push(`Latest approval summary: ${approvals[0].changeSummary}`);
        }
      }
    }

    if (approvalArtifacts.length === 0) {
      findings.push("No approval artifact has been exported.");
    } else {
      findings.push(`Latest approval artifact: ${approvalArtifacts[0].path}`);
    }

    if (planRuns[0]?.governanceHold) {
      findings.push(`Latest plan run remains in governance hold: ${(planRuns[0].approvalRequestIds || []).join(", ") || "(none)"}.`);
    }

    const latestWorkflow = workflows[0] || null;
    const latestWorkflowReasons = latestWorkflow?.statusReasons || [];
    const governanceHoldReason = latestWorkflowReasons.find((item) => item.code === "governance_hold");
    if (governanceHoldReason) {
      findings.push(`Latest workflow governance hold reason: ${governanceHoldReason.message}`);
    }

    const blockingFindings = findings.filter((entry) => {
      return (
        entry.startsWith("No approval requests") ||
        entry.includes("still pending") ||
        entry.includes("have not been retried") ||
        entry.startsWith("No approval artifact") ||
        entry.startsWith("Latest plan run remains in governance hold") ||
        entry.startsWith("Latest workflow governance hold reason")
      );
    });

    const summary = blockingFindings.length === 0
      ? "Approval review passed. Approval records, artifacts, and retries look complete."
      : `Approval review found ${blockingFindings.length} blocking issue(s).`;

    const record = {
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: "approval",
      target: "approval-governance",
      status: blockingFindings.length === 0 ? "approved" : "needs_attention",
      summary,
      findings
    };

    await this.stateStore.saveReview(record);
    return record;
  }
}

async function inspectKeyFiles(projectRoot) {
  const required = [
    "README.md",
    "package.json",
    "apps/cli/index.js",
    "packages/core/runtime.js",
    "scripts/check.js",
    "scripts/smoke-test.js"
  ];

  const findings = [];
  for (const relative of required) {
    try {
      await fs.access(path.join(projectRoot, relative));
      findings.push(`Found key file: ${relative}`);
    } catch {
      findings.push(`Missing key file: ${relative}`);
    }
  }
  return findings;
}

async function inspectArtifact(absolutePath) {
  try {
    const content = await fs.readFile(absolutePath, "utf8");
    const findings = [];
    if (!content.includes("## Plan Items")) {
      findings.push("Latest plan artifact is missing the '## Plan Items' section.");
    } else {
      findings.push("Latest plan artifact contains a '## Plan Items' section.");
    }
    if (!content.includes("## Notes")) {
      findings.push("Latest plan artifact is missing the '## Notes' section.");
    } else {
      findings.push("Latest plan artifact contains a '## Notes' section.");
    }
    return findings;
  } catch {
    return ["Latest plan artifact path exists in state, but the file could not be read."];
  }
}

async function inspectGitState(projectRoot) {
  try {
    const { stdout } = await execFileAsync("zsh", ["-lc", "git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git status --short || true"], {
      cwd: projectRoot
    });
    const trimmed = stdout.trim();
    if (!trimmed) {
      return ["Git status summary: clean or repository unavailable."];
    }
    return [`Git status summary present:
${summarizeGitStatus(trimmed)}`];
  } catch {
    return ["Git status summary unavailable."];
  }
}

async function inspectFileForPatterns(projectRoot, relativePath, patterns) {
  const absolutePath = path.join(projectRoot, relativePath);
  try {
    const content = await fs.readFile(absolutePath, "utf8");
    return patterns.map((pattern) => {
      return content.includes(pattern)
        ? `Found pattern "${pattern}" in ${relativePath}`
        : `Missing pattern "${pattern}" in ${relativePath}`;
    });
  } catch {
    return [`Missing file: ${relativePath}`];
  }
}

async function inspectFileSnippet(projectRoot, relativePath, anchor, contextLines) {
  const absolutePath = path.join(projectRoot, relativePath);
  try {
    const content = await fs.readFile(absolutePath, "utf8");
    const lines = content.split("\n");
    const index = lines.findIndex((line) => line.includes(anchor));
    if (index === -1) {
      return [`Missing snippet anchor "${anchor}" in ${relativePath}`];
    }
    const start = Math.max(0, index);
    const end = Math.min(lines.length, index + contextLines);
    const snippet = lines.slice(start, end).join("\n");
    return [`Snippet from ${relativePath} around "${anchor}":\n${snippet}`];
  } catch {
    return [`Missing file: ${relativePath}`];
  }
}

function summarizeWorkspaceSnapshots(snapshots) {
  if (!snapshots.length) {
    return ["No workspace snapshots have been recorded."];
  }

  const latest = snapshots[0];
  const findings = [
    `Latest workspace snapshot: ${latest.id} (${latest.label}) with ${latest.fileCount} files.`
  ];

  if (snapshots[1]) {
    const previous = snapshots[1];
    findings.push(`Previous workspace snapshot: ${previous.id} (${previous.label}) with ${previous.fileCount} files.`);
  }

  return findings;
}

function summarizeWorkspaceDiff(diff) {
  if (!diff) {
    return ["No workspace diff is attached to the latest plan run."];
  }
  if (!diff.ok) {
    return [`Workspace diff unavailable: ${diff.message}`];
  }
  return [
    `Workspace diff from ${diff.from.id} to ${diff.to.id}:`,
    `- added: ${diff.added.length}`,
    `- modified: ${diff.modified.length}`,
    `- removed: ${diff.removed.length}`
  ];
}
