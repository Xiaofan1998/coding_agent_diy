import { buildRepoSnapshot } from "../context/repo-context.js";
import { buildSubagentContextPackage } from "../core/working-memory.js";

const READ_ONLY_SUBAGENT_TOOLS = ["list_files", "read_file", "search_files", "search_web", "fetch_url", "git_diff", "git_status"];
const WRITE_CAPABLE_SUBAGENT_TOOLS = ["list_files", "read_file", "search_files", "search_web", "fetch_url", "run_shell", "apply_patch", "write_file", "git_diff", "git_status"];

export class SubagentManager {
  constructor({ config, runtimeFactory, stateStore, workspaceSnapshotManager }) {
    this.config = config;
    this.runtimeFactory = runtimeFactory;
    this.stateStore = stateStore;
    this.workspaceSnapshotManager = workspaceSnapshotManager;
  }

  async runSubagent({ objective, context, allowedTools = [], goal = null, sessionSummary = "", planItems = null, repoSnapshot = null }) {
    const resolvedGoal = goal || await this.stateStore.getActiveGoal();
    const resolvedPlanItems = planItems || await this.stateStore.getPlanItems();
    const resolvedSessionSummary = sessionSummary || (await this.stateStore.getSession()).summary || "";
    const resolvedRepoSnapshot = repoSnapshot || await buildRepoSnapshot(this.config, {
      query: objective,
      goal: resolvedGoal,
      activatedSkills: []
    });
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
      sessionSummary: resolvedSessionSummary,
      planItems: resolvedPlanItems,
      repoSnapshot: resolvedRepoSnapshot
    });

    const result = await runtime.runSyntheticTurn(contextPackage);

    const record = {
      id: `subagent_${Date.now()}`,
      objective,
      context: contextPackage,
      requestedTools,
      allowedTools: effectiveAllowedTools,
      governanceHold,
      approvalRequestIds: openApprovals.map((item) => item.id),
      createdAt: new Date().toISOString(),
      result
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
    const session = await this.stateStore.getSession();
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
        sessionSummary: session.summary,
        planItems,
        repoSnapshot: await buildRepoSnapshot(this.config, {
          query: item.content,
          goal,
          activatedSkills: []
        })
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

function summarizeSnapshot(snapshot) {
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    label: snapshot.label,
    fileCount: snapshot.fileCount
  };
}
