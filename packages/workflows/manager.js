import crypto from "node:crypto";

export class WorkflowManager {
  constructor({
    stateStore,
    subagentManager,
    planArtifactManager,
    reviewManager,
    reviewArtifactManager,
    traceArtifactManager
  }) {
    this.stateStore = stateStore;
    this.subagentManager = subagentManager;
    this.planArtifactManager = planArtifactManager;
    this.reviewManager = reviewManager;
    this.reviewArtifactManager = reviewArtifactManager;
    this.traceArtifactManager = traceArtifactManager;
  }

  async runDeliveryWorkflow({ title = "" } = {}) {
    const workflowId = `workflow_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const goal = await this.stateStore.getActiveGoal();
    const planItems = await this.stateStore.getPlanItems();

    const startTrace = {
      id: `trace_${crypto.randomUUID()}`,
      createdAt,
      kind: "workflow_start",
      workflowId,
      title: title || goal?.objective || "delivery workflow",
      goal: goal?.objective || null,
      planItemCount: planItems.length
    };
    await this.stateStore.saveTrace(startTrace);

    const planRun = await this.subagentManager.runPlan({
      planItems,
      mode: "sequential",
      workflowId
    });

    const planArtifact = await this.planArtifactManager.exportActivePlan({
      title: title || goal?.objective || "delivery-workflow-plan",
      goal,
      workflowId
    });

    await this.stateStore.saveTrace({
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "workflow_review_checkpoint",
      workflowId,
      planRunId: planRun.id,
      planArtifactId: planArtifact.id
    });

    const planReview = await this.reviewManager.runPlanReview();
    const repoReview = await this.reviewManager.runRepoReview();
    const codeReview = await this.reviewManager.runCodeReview();

    const latestReviews = [planReview, repoReview, codeReview];
    const reviewArtifacts = [];
    for (const review of latestReviews) {
      reviewArtifacts.push(
        await this.reviewArtifactManager.exportReviewArtifact({
          reviewId: review.id,
          title: `${review.kind} review`,
          workflowId
        })
      );
    }

    const approvalRequests = [];
    const nonApprovedReviews = latestReviews.filter((review) => review.status !== "approved");
    if (latestReviews.some((review) => review.status !== "approved")) {
      const approval = {
        id: `approval_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "pending",
        kind: "workflow_review_gate",
        title: `Review gate for ${title || goal?.objective || workflowId}`,
        summary: "Workflow reviews reported issues and require explicit approval or follow-up.",
        workflowId,
        reviewIds: latestReviews.map((review) => review.id),
        blockingReviews: nonApprovedReviews
          .map((review) => ({
            id: review.id,
            kind: review.kind,
            status: review.status,
            summary: review.summary
          }))
      };
      await this.stateStore.saveApprovalRequest(approval);
      approvalRequests.push(approval);
      await this.stateStore.saveTrace({
        id: `trace_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        kind: "approval_requested",
        workflowId,
        approvalRequestId: approval.id,
        reviewIds: approval.reviewIds
      });
    }

    const endTrace = {
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "workflow_end",
      workflowId,
      planRunId: planRun.id,
      planArtifactId: planArtifact.id,
      reviewIds: latestReviews.map((review) => review.id),
      approvalRequestIds: approvalRequests.map((approval) => approval.id)
    };
    await this.stateStore.saveTrace(endTrace);
    const traceArtifact = await this.traceArtifactManager.exportTraceArtifact({
      workflowId,
      title: `${title || goal?.objective || "delivery workflow"} traces`,
      limit: 50
    });

    const record = {
      id: workflowId,
      createdAt,
      title: title || goal?.objective || "delivery workflow",
      goal: goal?.objective || null,
      planRunId: planRun.id,
      planArtifactId: planArtifact.id,
      reviewIds: latestReviews.map((review) => review.id),
      reviewArtifactIds: reviewArtifacts.map((artifact) => artifact.id),
      approvalRequestIds: approvalRequests.map((approval) => approval.id),
      traceIds: [startTrace.id, endTrace.id],
      traceArtifactId: traceArtifact.id,
      statusReasons: buildWorkflowStatusReasons({
        planRun,
        nonApprovedReviews,
        approvalRequests
      }),
      status: approvalRequests.length > 0
        ? "pending_approval"
        : (latestReviews.every((review) => review.status === "approved") ? "approved" : "needs_attention")
    };

    await this.stateStore.saveWorkflowRun(record);
    return {
      ...record,
      planRun,
      planArtifact,
      reviews: latestReviews,
      reviewArtifacts,
      approvalRequests,
      traceArtifact
    };
  }
}

function buildWorkflowStatusReasons({ planRun, nonApprovedReviews, approvalRequests }) {
  const reasons = [];

  if (planRun?.governanceHold) {
    reasons.push({
      code: "governance_hold",
      category: "governance",
      message: `Plan execution is in governance hold because pending approvals exist: ${(planRun.approvalRequestIds || []).join(", ") || "(none)"}.`
    });
  }

  if ((approvalRequests || []).length > 0) {
    reasons.push({
      code: "approval_pending",
      category: "approval",
      message: `${approvalRequests.length} approval request(s) are still required before the workflow can be treated as complete.`
    });
  }

  for (const review of nonApprovedReviews || []) {
    reasons.push({
      code: `review_${review.kind}_needs_attention`,
      category: "review",
      reviewKind: review.kind,
      message: `${review.kind} review is ${review.status}: ${review.summary}`
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      code: "workflow_ready",
      category: "success",
      message: "All workflow reviews passed and no approval gate remains open."
    });
  }

  return reasons;
}
