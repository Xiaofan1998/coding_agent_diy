export function buildStateSnapshotSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "code-agent-state.v1",
    title: "Code Agent State Snapshot",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "generatedAt",
      "projectRoot",
      "session",
      "governance",
      "toolPolicy",
      "goal",
      "plan",
      "counts",
      "latestWorkflow",
      "recent",
      "recommendations",
      "artifactCoverage"
    ],
    properties: {
      schemaVersion: { type: "string" },
      generatedAt: { type: "string" },
      projectRoot: { type: "string" },
      session: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "turnCount"],
        properties: {
          summary: { type: "string" },
          turnCount: { type: "number" }
        }
      },
      governance: {
        type: "object",
        additionalProperties: false,
        required: [
          "openApprovalCount",
          "openApprovalIds",
          "latestWorkflowStatus",
          "latestWorkflowReasonCodes",
          "governanceHoldActive",
          "approvalPendingActive",
          "goalBlockedActive",
          "blockedGoalId",
          "blockedGoalObjective",
          "blockedGoalTurnCount",
          "blockedGoalBlockCount",
          "blockedGoalLastBlockerCode",
          "blockedGoalLastBlockerMessage",
          "recoverySuggestions"
        ],
        properties: {
          openApprovalCount: { type: "number" },
          openApprovalIds: { type: "array", items: { type: "string" } },
          latestWorkflowStatus: { type: ["string", "null"] },
          latestWorkflowReasonCodes: { type: "array", items: { type: "string" } },
          governanceHoldActive: { type: "boolean" },
          approvalPendingActive: { type: "boolean" },
          goalBlockedActive: { type: "boolean" },
          blockedGoalId: { type: ["string", "null"] },
          blockedGoalObjective: { type: ["string", "null"] },
          blockedGoalTurnCount: { type: "number" },
          blockedGoalBlockCount: { type: "number" },
          blockedGoalLastBlockerCode: { type: ["string", "null"] },
          blockedGoalLastBlockerMessage: { type: ["string", "null"] },
          recoverySuggestions: { type: "array", items: { type: "string" } }
        }
      },
      toolPolicy: {
        type: "object",
        additionalProperties: false,
        required: [
          "strategyMode",
          "maxToolRisk",
          "subagentMaxToolRisk",
          "requireConfirmationForWrite",
          "requireConfirmationForRestricted"
        ],
        properties: {
          strategyMode: { type: "string" },
          maxToolRisk: { type: "string" },
          subagentMaxToolRisk: { type: "string" },
          requireConfirmationForWrite: { type: "boolean" },
          requireConfirmationForRestricted: { type: "boolean" }
        }
      },
      goal: {
        type: ["object", "null"]
      },
      plan: {
        type: "object",
        additionalProperties: false,
        required: ["total", "completed", "linkedSubagentCount", "pendingSubagentReviewCount", "currentPlanSummary"],
        properties: {
          total: { type: "number" },
          completed: { type: "number" },
          linkedSubagentCount: { type: "number" },
          pendingSubagentReviewCount: { type: "number" },
          currentPlanSummary: { type: ["object", "null"] }
        }
      },
      counts: { type: "object" },
      latestWorkflow: {
        type: ["object", "null"]
      },
      recent: { type: "object" },
      recommendations: {
        type: "object",
        additionalProperties: false,
        required: ["suggestedFirstTools", "suggestedNextReads", "suggestedNextReadLabels", "recommendedActions"],
        properties: {
          suggestedFirstTools: { type: "array", items: { type: "string" } },
          suggestedNextReads: { type: "array", items: { type: "object" } },
          suggestedNextReadLabels: { type: "array", items: { type: "string" } },
          recommendedActions: { type: "array", items: { type: "object" } }
        }
      },
      artifactCoverage: {
        type: "object",
        additionalProperties: false,
        required: ["missing", "complete"],
        properties: {
          missing: { type: "array", items: { type: "string" } },
          complete: { type: "boolean" }
        }
      }
    }
  };
}
