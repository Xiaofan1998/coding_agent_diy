export async function buildStateSnapshot({ config, stateStore, generatedAt = new Date().toISOString() }) {
  const [session, dashboard] = await Promise.all([
    stateStore.getSession(),
    stateStore.getDashboardSummary()
  ]);

  return {
    schemaVersion: "code-agent-state.v1",
    generatedAt,
    projectRoot: config.projectRoot,
    session: {
      transcriptTurnCount: session.transcriptTurnCount || 0,
      transcriptTurnCount: session.transcriptTurnCount || 0
    },
    governance: dashboard.governanceSummary || {
      openApprovalCount: 0,
      openApprovalIds: [],
      latestWorkflowStatus: null,
      latestWorkflowReasonCodes: [],
      governanceHoldActive: false,
      approvalPendingActive: false,
      goalBlockedActive: false,
      blockedGoalId: null,
      blockedGoalObjective: null,
      blockedGoalTurnCount: 0,
      blockedGoalBlockCount: 0,
      blockedGoalLastBlockerCode: null,
      blockedGoalLastBlockerMessage: null,
      recoverySuggestions: []
    },
    toolPolicy: {
      strategyMode: config.runtime.strategyMode || "balanced",
      maxToolRisk: config.runtime.maxToolRisk,
      subagentMaxToolRisk: config.runtime.subagentMaxToolRisk,
      requireConfirmationForWrite: config.runtime.requireConfirmationForWrite,
      requireConfirmationForRestricted: config.runtime.requireConfirmationForRestricted
    },
    goal: dashboard.activeGoal || null,
    plan: {
      total: dashboard.planItemCount || 0,
      completed: dashboard.completedPlanItemCount || 0,
      linkedSubagentCount: dashboard.linkedSubagentCount || 0,
      pendingSubagentReviewCount: dashboard.pendingSubagentReviewCount || 0,
      currentPlanSummary: dashboard.currentPlanSummary || null
    },
    counts: {
      reviews: dashboard.reviewCount || 0,
      approvalRequests: dashboard.approvalRequestCount || 0,
      approvalArtifacts: dashboard.approvalArtifactCount || 0,
      workflows: dashboard.workflowRunCount || 0,
      workflowArtifacts: dashboard.workflowArtifactCount || 0,
      traces: dashboard.traceCount || 0,
      traceArtifacts: dashboard.traceArtifactCount || 0
    },
    latestWorkflow: dashboard.latestWorkflowBundle || null,
    recent: {
      planArtifacts: dashboard.recentPlanArtifacts || [],
      reviewArtifacts: dashboard.recentReviewArtifacts || [],
      approvalRequests: dashboard.recentApprovalRequests || [],
      approvalArtifacts: dashboard.recentApprovalArtifacts || [],
      workflowArtifacts: dashboard.recentWorkflowArtifacts || [],
      traceArtifacts: dashboard.recentTraceArtifacts || []
    },
    recommendations: {
      suggestedFirstTools: dashboard.suggestedFirstTools || [],
      suggestedNextReads: dashboard.suggestedNextReads || [],
      suggestedNextReadLabels: dashboard.suggestedNextReadLabels || [],
      recommendedActions: dashboard.recommendedActions || []
    },
    artifactCoverage: dashboard.artifactCoverage || {
      missing: [],
      complete: true
    }
  };
}

export async function buildStateSummary({ config, stateStore, generatedAt = new Date().toISOString() }) {
  const snapshot = await buildStateSnapshot({ config, stateStore, generatedAt });

  return {
    schemaVersion: "code-agent-state-summary.v1",
    generatedAt: snapshot.generatedAt,
    projectRoot: snapshot.projectRoot,
    goal: snapshot.goal
      ? {
          id: snapshot.goal.id,
          objective: snapshot.goal.objective,
          status: snapshot.goal.status,
          turnCount: snapshot.goal.turnCount ?? 0,
          blockCount: snapshot.goal.blockCount ?? 0,
          lastBlockerCode: snapshot.goal.lastBlockerCode || null,
          lastBlockerMessage: snapshot.goal.lastBlockerMessage || null
        }
      : null,
    plan: snapshot.plan,
    governance: snapshot.governance,
    toolPolicy: snapshot.toolPolicy,
    latestWorkflow: snapshot.latestWorkflow
      ? {
          id: snapshot.latestWorkflow.id,
          status: snapshot.latestWorkflow.status,
          statusReasonCodes: snapshot.latestWorkflow.statusReasonCodes || []
        }
      : null,
    recommendations: {
      suggestedFirstTools: snapshot.recommendations.suggestedFirstTools,
      suggestedNextReadLabels: snapshot.recommendations.suggestedNextReadLabels,
      recommendedActions: snapshot.recommendations.recommendedActions || []
    },
    artifactCoverage: snapshot.artifactCoverage
  };
}

export async function buildStateUiPayload({ config, stateStore, generatedAt = new Date().toISOString() }) {
  const summary = await buildStateSummary({ config, stateStore, generatedAt });
  const governance = summary.governance || {};
  const latestWorkflow = summary.latestWorkflow || null;
  const cards = [
    {
      id: "plan",
      title: "Plan",
      value: `${summary.plan.completed}/${summary.plan.total}`,
      detail: "completed"
    },
    {
      id: "approvals",
      title: "Open Approvals",
      value: String(governance.openApprovalCount ?? 0),
      detail: (governance.openApprovalIds || []).join(", ") || "(none)"
    },
    {
      id: "workflow",
      title: "Latest Workflow",
      value: latestWorkflow?.id || "(none)",
      detail: latestWorkflow?.status || "(none)"
    },
    {
      id: "strategy",
      title: "Strategy Mode",
      value: summary.toolPolicy?.strategyMode || "balanced",
      detail: `risk=${summary.toolPolicy?.maxToolRisk || "(none)"}`
    },
    {
      id: "recommendations",
      title: "Suggested First Tools",
      value: String((summary.recommendations?.suggestedFirstTools || []).length),
      detail: (summary.recommendations?.suggestedFirstTools || []).join(", ") || "(none)"
    },
    {
      id: "goal-status",
      title: "Goal Status",
      value: summary.goal?.status || "(none)",
      detail: summary.goal?.lastBlockerMessage || summary.goal?.lastBlockerCode || "(none)"
    },
    {
      id: "goal-recovery",
      title: "Goal Recovery",
      value: String((summary.governance?.recoverySuggestions || []).length),
      detail: (summary.governance?.recoverySuggestions || []).join(", ") || "(none)"
    },
    {
      id: "linked-subagents",
      title: "Linked Subagents",
      value: String(summary.plan?.linkedSubagentCount || 0),
      detail: `${summary.plan?.pendingSubagentReviewCount || 0} pending review`
    },
    {
      id: "plan-summary",
      title: "Plan Summary",
      value: summary.plan?.currentPlanSummary?.latestPlanRunId || "(none)",
      detail: `${summary.plan?.currentPlanSummary?.completedPlanItemCount || 0}/${summary.plan?.currentPlanSummary?.planItemCount || 0} items`
    }
  ];

  return {
    schemaVersion: "code-agent-ui-state.v1",
    generatedAt: summary.generatedAt,
    projectRoot: summary.projectRoot,
    hero: {
      goal: summary.goal?.objective || "(none)",
      workflowStatus: latestWorkflow?.status || "(none)",
      governanceLabel: governance.goalBlockedActive
        ? "goal-blocked"
        : governance.governanceHoldActive
        ? "governance-hold"
        : (governance.approvalPendingActive ? "approval-pending" : "clear")
    },
    cards,
    sections: [
      {
        id: "overview",
        title: "Overview",
        cardIds: ["plan", "workflow", "linked-subagents", "strategy"]
      },
      {
        id: "governance",
        title: "Governance",
        cardIds: ["approvals", "goal-status"],
        reasonCodes: latestWorkflow?.statusReasonCodes || []
      },
      {
        id: "recommendations",
        title: "Recommendations",
        cardIds: ["recommendations", "goal-recovery"],
        nextReadLabels: summary.recommendations?.suggestedNextReadLabels || [],
        recommendedActions: summary.recommendations?.recommendedActions || []
      },
      {
        id: "plan-execution",
        title: "Plan Execution",
        cardIds: ["plan-summary", "linked-subagents"]
      }
    ],
    governance,
    toolPolicy: summary.toolPolicy,
    recommendations: summary.recommendations,
    latestWorkflow
  };
}
