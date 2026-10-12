import { buildSubagentContextPackage } from "./context-package.js";

const READ_ONLY_SUBAGENT_TOOLS = ["list_files", "read_file", "search_files", "search_web", "fetch_url", "git_diff", "git_status"];
const WRITE_CAPABLE_SUBAGENT_TOOLS = ["list_files", "read_file", "search_files", "search_web", "fetch_url", "run_shell", "apply_patch", "write_file", "git_diff", "git_status"];

export class SubagentManager {
  constructor({ config, runtimeFactory, stateStore, workspaceSnapshotManager }) {
    this.config = config;
    this.runtimeFactory = runtimeFactory;
    this.stateStore = stateStore;
    this.workspaceSnapshotManager = workspaceSnapshotManager;
  }

  async runSubagent({ objective, context, allowedTools = [], goal = null, sessionContext = "", planItems = null }) {
    const resolvedGoal = goal || await this.stateStore.getActiveGoal();
    const resolvedPlanItems = planItems || await this.stateStore.getPlanItems();
    const resolvedSessionContext = sessionContext;
    const openApprovals = await this.stateStore.listOpenApprovalRequests();
    const governanceHold = openApprovals.length > 0;
    const requestedTools = allowedTools.length > 0 ? allowedTools : WRITE_CAPABLE_SUBAGENT_TOOLS;
    const effectiveAllowedTools = governanceHold
      ? requestedTools.filter((tool) => READ_ONLY_SUBAGENT_TOOLS.includes(tool))
      : requestedTools;
    const governanceContext = governanceHold
      ? `Governance hold is active for direct subagent execution because pending approvals exist (${openApprovals.map((item) => item.id).join(", ")}). Limit work to read-only inspection and blocked-task reporting.`
      : "";
    if (governanceHold) {
      await this.stateStore.saveTrace({
        id: `trace_${Date.now()}_subagent_hold`,
        createdAt: new Date().toISOString(),
        kind: "subagent_governance_hold",
        objective,
        requestedTools,
        allowedTools: effectiveAllowedTools,
        approvalRequestIds: openApprovals.map((item) => item.id)
      });
    }
    const runtime = await this.runtimeFactory({
      subagent: true,
      allowedTools: effectiveAllowedTools
    });
    const contextPackage = buildSubagentContextPackage({
      objective,
      extraContext: [governanceContext, context].filter(Boolean).join("\n\n"),
      allowedTools: effectiveAllowedTools,
      goal: resolvedGoal,
      sessionContext: resolvedSessionContext,
      planItems: resolvedPlanItems
    });

    const result = await runtime.runSyntheticTurn(contextPackage);

    // Validate subagent result (per subagent-driven-development: validate before integrating)
    const validation = validateSubagentResult(objective, result);

    const record = {
      id: `subagent_${Date.now()}`,
      objective,
      context: contextPackage,
      requestedTools,
      allowedTools: effectiveAllowedTools,
      governanceHold,
      approvalRequestIds: openApprovals.map((item) => item.id),
      createdAt: new Date().toISOString(),
      result,
      validation: {
        passed: validation.passed,
        checks: validation.checks,
        summary: validation.summary
      }
    };

    await this.stateStore.saveSubagentRecord(record);
    await this.stateStore.saveTrace({
      id: `trace_${Date.now()}_subagent_spawned`,
      createdAt: new Date().toISOString(),
      kind: "subagent_spawned",
      objective,
      requestedTools,
      allowedTools: effectiveAllowedTools,
      governanceHold,
      approvalRequestIds: openApprovals.map((item) => item.id),
      recordId: record.id
    });

    return {
      status: governanceHold ? "blocked" : "done",
      summary: result.message,
      recordId: record.id,
      governanceHold,
      allowedTools: effectiveAllowedTools
    };
  }

  async runPlan({ planItems, mode = "sequential", workflowId = "" }) {
    const goal = await this.stateStore.getActiveGoal();
    const openApprovals = await this.stateStore.listOpenApprovalRequests();
    const governanceHold = openApprovals.length > 0;
    const beforeSnapshot = await this.workspaceSnapshotManager.captureSnapshot({
      label: `before plan run ${new Date().toISOString()}`
    });
    if (governanceHold) {
      await this.stateStore.saveTrace({
        id: `trace_${Date.now()}`,
        createdAt: new Date().toISOString(),
        kind: "plan_governance_hold",
        workflowId: workflowId || null,
        approvalRequestIds: openApprovals.map((item) => item.id)
      });
    }
    const results = [];
    const nextPlanItems = [];

    for (const item of planItems) {
      if (item.status === "completed" || item.status === "skipped") {
        results.push({
          planItem: item,
          status: "skipped"
        });
        nextPlanItems.push(item);
        continue;
      }

      const allowedTools = governanceHold
        ? READ_ONLY_SUBAGENT_TOOLS
        : WRITE_CAPABLE_SUBAGENT_TOOLS;
      const executionContext = governanceHold
        ? `Governance hold is active because pending approval requests exist (${openApprovals.map((item) => item.id).join(", ")}). Do not modify files. Inspect the task, gather evidence, and report what remains blocked pending approval resolution.`
        : "Execute this plan item within the current project. Make concrete progress, modify files when needed, and report what changed plus verification notes.";
      const subagentResult = await this.runSubagent({
        objective: item.content,
        context: executionContext,
        allowedTools,
        goal,
        sessionContext: "",
        planItems
      });

      results.push({
        planItem: item,
        status: governanceHold ? "blocked" : subagentResult.status,
        summary: subagentResult.summary,
        recordId: subagentResult.recordId,
        governanceHold
      });

      nextPlanItems.push({
        ...item,
        status: governanceHold
          ? "blocked"
          : (subagentResult.status === "done" ? "completed" : item.status)
      });
    }

    await this.stateStore.updatePlan(nextPlanItems);
    const afterSnapshot = await this.workspaceSnapshotManager.captureSnapshot({
      label: `after plan run ${new Date().toISOString()}`
    });
    const workspaceDiff = await this.workspaceSnapshotManager.diffSnapshots({
      fromId: beforeSnapshot.id,
      toId: afterSnapshot.id
    });

    const record = {
      id: `planrun_${Date.now()}`,
      createdAt: new Date().toISOString(),
      workflowId: workflowId || null,
      mode,
      governanceHold,
      approvalRequestIds: openApprovals.map((item) => item.id),
      totalCount: planItems.length,
      completedCount: results.filter((item) => item.status === "done" || item.status === "skipped").length,
      results,
      beforeSnapshot: summarizeSnapshot(beforeSnapshot),
      afterSnapshot: summarizeSnapshot(afterSnapshot),
      workspaceDiff
    };

    await this.stateStore.savePlanRun(record);
    return record;
  }
}

/**
 * Validate a subagent result against the original objective.
 * Per subagent-driven-development: validate returned results before integrating.
 */
function validateSubagentResult(objective, result) {
  const checks = [];
  const message = (result && result.message) || "";

  // Check 1: Non-empty result
  checks.push({
    name: "non_empty",
    passed: Boolean(message && message.length > 0),
    detail: message ? `Result length: ${message.length} chars` : "Result is empty"
  });

  // Check 2: No error indicators in result
  const errorKeywords = ["error", "failed", "unable to", "could not", "timeout"];
  const foundErrors = errorKeywords.filter((kw) => message.toLowerCase().includes(kw));
  checks.push({
    name: "no_error_signals",
    passed: foundErrors.length === 0,
    detail: foundErrors.length > 0
      ? `Found potential error keywords: ${foundErrors.join(", ")}`
      : "No error signals detected"
  });

  // Check 3: Relevance to objective
  const objectiveTokens = objective
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/)
    .filter((t) => t.length > 3);
  const matchedTokens = objectiveTokens.filter((token) => message.toLowerCase().includes(token));
  const relevanceRatio = objectiveTokens.length > 0
    ? matchedTokens.length / objectiveTokens.length
    : 0;
  checks.push({
    name: "objective_relevance",
    passed: relevanceRatio >= 0.2,
    detail: `Matched ${matchedTokens.length}/${objectiveTokens.length} objective tokens (${(relevanceRatio * 100).toFixed(0)}%)`
  });

  const passed = checks.every((c) => c.passed);
  const summary = passed
    ? "Subagent result validated successfully"
    : `Subagent result has ${checks.filter((c) => !c.passed).length} failed check(s)`;

  return { passed, checks, summary };
}

function summarizeSnapshot(snapshot) {
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    label: snapshot.label,
    fileCount: snapshot.fileCount
  };
}
