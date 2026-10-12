import { STRATEGY_PROFILES, resolveStrategyProfile } from "../core/strategy-mode.js";

export function createStateTools(config, stateStore, skillDiscovery, subagentManager, reviewManager, planArtifactManager, reviewArtifactManager, workspaceSnapshotManager, workflowManager, workflowArtifactManager, traceArtifactManager, dashboardArtifactManager, bundleIndexArtifactManager, approvalArtifactManager, stateSnapshotArtifactManager) {
  return [
    {
      name: "get_runtime_settings",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get the current runtime strategy mode and effective execution settings.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => ({
        strategyMode: config.runtime.strategyMode || "balanced",
        runtime: config.runtime
      })
    },
    {
      name: "set_strategy_mode",
      description: `Persist and apply a runtime strategy mode. Available modes: ${Object.keys(STRATEGY_PROFILES).join(", ")}.`,
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          mode: { type: "string" }
        },
        required: ["mode"],
        additionalProperties: false
      },
      execute: async ({ mode }) => {
        if (!STRATEGY_PROFILES[mode]) {
          throw new Error(`Unknown strategy mode: ${mode}`);
        }
        const profile = resolveStrategyProfile(mode);
        const saved = await stateStore.saveRuntimeSettings({
          strategyMode: mode,
          maxToolRisk: profile.maxToolRisk,
          subagentMaxToolRisk: profile.subagentMaxToolRisk,
          autoRunDeliveryWorkflow: profile.autoRunDeliveryWorkflow,
          enforceSuggestedFirstTool: profile.enforceSuggestedFirstTool
        });
        config.runtime = {
          ...config.runtime,
          ...saved
        };
        return {
          strategyMode: mode,
          runtime: config.runtime
        };
      }
    },
    {
      name: "update_plan",
      description: "Replace the current session plan items.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                content: { type: "string" },
                status: { type: "string" }
              },
              required: ["content", "status"],
              additionalProperties: false
            }
          }
        },
        required: ["items"],
        additionalProperties: false
      },
      execute: async ({ items }) => stateStore.updatePlan(items)
    },
    {
      name: "get_plan_summary",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get a linked summary of the current plan, latest execution status, and recent subagent linkage.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.getCurrentPlanSummary()
    },
    {
      name: "update_plan_item_status",
      description: "Update one plan item status by 1-based index.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          index: { type: "number" },
          status: { type: "string" }
        },
        required: ["index", "status"],
        additionalProperties: false
      },
      execute: async ({ index, status }) => stateStore.updatePlanItemStatus(index, status)
    },
    {
      name: "reset_blocked_plan_items",
      description: "Reset all blocked plan items back to pending.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.resetBlockedPlanItems()
    },
    {
      name: "create_goal",
      description: "Create a persistent active goal.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          objective: { type: "string" }
        },
        required: ["objective"],
        additionalProperties: false
      },
      execute: async ({ objective }) => stateStore.createGoal(objective)
    },
    {
      name: "update_goal",
      description: "Update the active goal status.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          id: { type: "string" }
        },
        required: ["status"],
        additionalProperties: false
      },
      execute: async ({ status, id = "" }) => stateStore.updateGoalStatus(status, id)
    },
    {
      name: "list_goals",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List recent persistent goals.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ limit = 20 }) => stateStore.listGoals(limit)
    },
    {
      name: "read_goal",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read one persistent goal record by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => stateStore.getGoal(id)
    },
    {
      name: "resume_goal",
      description: "Resume a previous goal and make it the active goal.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => stateStore.resumeGoal(id)
    },
    {
      name: "get_dashboard_summary",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get a high-level summary of goals, plans, workflows, artifacts, and traces.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.getDashboardSummary()
    },
    {
      name: "get_next_actions",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get structured recommended next actions derived from the current dashboard, plan, governance, and subagent state.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => {
        const dashboard = await stateStore.getDashboardSummary();
        return {
          activeGoal: dashboard.activeGoal || null,
          planProgress: {
            completed: dashboard.completedPlanItemCount || 0,
            total: dashboard.planItemCount || 0
          },
          suggestedFirstTools: dashboard.suggestedFirstTools || [],
          suggestedNextReadLabels: dashboard.suggestedNextReadLabels || [],
          recommendedActions: dashboard.recommendedActions || []
        };
      }
    },
    {
      name: "get_state_snapshot",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get a stable versioned machine-readable state snapshot for external integrations.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateSnapshotArtifactManager.getSnapshot()
    },
    {
      name: "get_state_snapshot_schema",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get the machine-readable JSON schema for code-agent-state.v1 snapshots.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateSnapshotArtifactManager.getSchema()
    },
    {
      name: "get_state_summary",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get a compact machine-readable summary view derived from the full state snapshot.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateSnapshotArtifactManager.getSummary()
    },
    {
      name: "get_state_ui_payload",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get a UI-oriented machine-state payload for dashboards and frontend panels.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateSnapshotArtifactManager.getUiPayload()
    },
    {
      name: "export_state_ui_artifact",
      description: "Export a UI-oriented machine-state payload into the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => stateSnapshotArtifactManager.exportUiPayload({ title })
    },
    {
      name: "export_state_ui_html_artifact",
      description: "Export a static HTML dashboard rendered from the UI-oriented machine-state payload.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => stateSnapshotArtifactManager.exportUiHtml({ title })
    },
    {
      name: "export_state_demo_html_artifact",
      description: "Export a static HTML demo page linking docs and recent machine-state artifacts.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => stateSnapshotArtifactManager.exportDemoOverview({ title })
    },
    {
      name: "export_state_ui_demo_artifact",
      description: "Export a static HTML page that renders the ui-state payload together with the state artifact index.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => stateSnapshotArtifactManager.exportUiDemo({ title })
    },
    {
      name: "get_state_artifact_index",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get a unified index over exported machine-state artifacts and their kinds.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateSnapshotArtifactManager.getArtifactIndex()
    },
    {
      name: "export_state_artifact_index",
      description: "Export the unified machine-state artifact index into the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => stateSnapshotArtifactManager.exportArtifactIndex({ title })
    },
    {
      name: "get_bundle_index_summary",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Get a compact index over dashboard, workflow bundles, review bundles, and trace bundles.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.getBundleIndexSummary()
    },
    {
      name: "export_dashboard_artifact",
      description: "Export the current dashboard summary to a markdown artifact inside the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => dashboardArtifactManager.exportDashboardArtifact({ title })
    },
    {
      name: "list_dashboard_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported dashboard artifact records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listDashboardArtifacts()
    },
    {
      name: "read_dashboard_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a dashboard artifact by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getDashboardArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown dashboard artifact: ${id}`);
        }
        return record;
      }
    },
    {
      name: "list_skills",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List available skills and their metadata.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => skillDiscovery.listSkills()
    },
    {
      name: "read_skill",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read one skill body by name.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        required: ["name"],
        additionalProperties: false
      },
      execute: async ({ name }) => {
        const skill = await skillDiscovery.readSkill(name);
        if (!skill) {
          throw new Error(`Unknown skill: ${name}`);
        }
        return skill;
      }
    },
    {
      name: "spawn_subagent",
      description: "Run a bounded child session with narrow context. When governance hold is active, requested write-capable tools may be reduced to a read-only subset.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          objective: { type: "string" },
          context: { type: "string" },
          allowedTools: { type: "array", items: { type: "string" } }
        },
        required: ["objective"],
        additionalProperties: false
      },
      execute: async ({ objective, context = "", allowedTools = [] }) => {
        return subagentManager.runSubagent({ objective, context, allowedTools });
      }
    },
    {
      name: "execute_plan",
      description: "Execute saved plan items through the subagent manager.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          mode: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ mode = "sequential" }) => {
        return subagentManager.runPlan({
          planItems: await stateStore.getPlanItems(),
          mode
        });
      }
    },
    {
      name: "list_subagents",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List saved subagent execution records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listSubagentRecords()
    },
    {
      name: "read_subagent",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a saved subagent execution record by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getSubagentRecord(id);
        if (!record) {
          throw new Error(`Unknown subagent record: ${id}`);
        }
        return record;
      }
    },
    {
      name: "list_plan_runs",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List persisted plan execution records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listPlanRuns()
    },
    {
      name: "read_plan_run",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a persisted plan execution record by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getPlanRunBundle(id);
        if (!record) {
          throw new Error(`Unknown plan run: ${id}`);
        }
        return record;
      }
    },
    {
      name: "export_plan_artifact",
      description: "Export the active plan to a markdown artifact inside the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => {
        const goal = await stateStore.getActiveGoal();
        return planArtifactManager.exportActivePlan({ title, goal });
      }
    },
    {
      name: "list_plan_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported plan artifact records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listPlanArtifacts()
    },
    {
      name: "read_plan_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read an exported plan artifact record by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getPlanArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown plan artifact: ${id}`);
        }
        return record;
      }
    },
    {
      name: "run_review",
      description: "Run a named review workflow for plan, subagents, session, or repo artifacts.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          kind: { type: "string" }
        },
        required: ["kind"],
        additionalProperties: false
      },
      execute: async ({ kind }) => {
        if (kind === "plan") {
          return reviewManager.runPlanReview();
        }
        if (kind === "subagents") {
          return reviewManager.runSubagentReview();
        }
        if (kind === "session") {
          return reviewManager.runSessionReview();
        }
        if (kind === "repo") {
          return reviewManager.runRepoReview();
        }
        if (kind === "code") {
          return reviewManager.runCodeReview();
        }
        if (kind === "strategy") {
          return reviewManager.runStrategyReview();
        }
        if (kind === "approval") {
          return reviewManager.runApprovalReview();
        }
        throw new Error(`Unknown review kind: ${kind}`);
      }
    },
    {
      name: "list_reviews",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List saved review records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listReviews()
    },
    {
      name: "list_approval_requests",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List saved approval requests and their statuses.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listApprovalRequests()
    },
    {
      name: "read_approval_request",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read one approval request by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getApprovalRequest(id);
        if (!record) {
          throw new Error(`Unknown approval request: ${id}`);
        }
        return record;
      }
    },
    {
      name: "resolve_approval_request",
      description: "Approve or reject an approval request.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string" },
          note: { type: "string" }
        },
        required: ["id", "status"],
        additionalProperties: false
      },
      execute: async ({ id, status, note = "" }) => {
        const record = await stateStore.resolveApprovalRequest(id, {
          status,
          note,
          resolvedAt: new Date().toISOString()
        });
        if (!record) {
          throw new Error(`Unknown approval request: ${id}`);
        }
        return record;
      }
    },
    {
      name: "retry_approval_request",
      description: "Retry an approved tool_policy_gate action using its stored exact tool arguments.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getApprovalRequest(id);
        if (!record) {
          throw new Error(`Unknown approval request: ${id}`);
        }
        return record;
      }
    },
    {
      name: "export_approval_artifact",
      description: "Export an approval request audit artifact inside the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          approvalId: { type: "string" },
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ approvalId = "", title = "" }) => {
        return approvalArtifactManager.exportApprovalArtifact({ approvalId, title });
      }
    },
    {
      name: "export_state_snapshot_artifact",
      description: "Export a versioned machine-readable state snapshot into the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => stateSnapshotArtifactManager.exportSnapshot({ title })
    },
    {
      name: "diff_state_snapshot",
      description: "Compare a saved machine-state snapshot artifact against another snapshot or the current state.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          fromId: { type: "string" },
          toId: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ fromId = "", toId = "" }) => stateSnapshotArtifactManager.diffSnapshots({ fromId, toId })
    },
    {
      name: "list_state_snapshot_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported machine-readable state snapshot artifacts.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listStateSnapshotArtifacts()
    },
    {
      name: "read_state_snapshot_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read one exported machine-readable state snapshot artifact by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getStateSnapshotArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown state snapshot artifact: ${id}`);
        }
        return record;
      }
    },
    {
      name: "list_approval_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported approval artifact records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listApprovalArtifacts()
    },
    {
      name: "read_approval_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read an approval artifact by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getApprovalArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown approval artifact: ${id}`);
        }
        return record;
      }
    },
    {
      name: "list_review_bundles",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List recent review bundles with linked workflow and artifact context.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ limit = 10 }) => stateStore.listReviewBundles(limit)
    },
    {
      name: "read_review",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a saved review record by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getReviewBundle(id);
        if (!record) {
          throw new Error(`Unknown review: ${id}`);
        }
        return record;
      }
    },
    {
      name: "export_review_artifact",
      description: "Export a review record to a markdown artifact inside the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          reviewId: { type: "string" },
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ reviewId = "", title = "" }) => {
        return reviewArtifactManager.exportReviewArtifact({ reviewId, title });
      }
    },
    {
      name: "list_review_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported review artifact records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listReviewArtifacts()
    },
    {
      name: "read_review_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read an exported review artifact record by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getReviewArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown review artifact: ${id}`);
        }
        return record;
      }
    },
    {
      name: "capture_workspace_snapshot",
      description: "Capture a snapshot of source and config files in the workspace for later diffing.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          label: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ label = "" }) => workspaceSnapshotManager.captureSnapshot({ label })
    },
    {
      name: "list_workspace_snapshots",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List saved workspace snapshots.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listWorkspaceSnapshots()
    },
    {
      name: "diff_workspace_snapshots",
      description: "Compare two workspace snapshots or the two most recent snapshots.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          fromId: { type: "string" },
          toId: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ fromId = "", toId = "" }) => workspaceSnapshotManager.diffSnapshots({ fromId, toId })
    },
    {
      name: "run_delivery_workflow",
      description: "Run the end-to-end delivery workflow: execute the active plan, export artifacts, and run reviews.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => workflowManager.runDeliveryWorkflow({ title })
    },
    {
      name: "list_workflow_runs",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List persisted workflow run records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listWorkflowRuns()
    },
    {
      name: "list_workflow_bundles",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List recent workflow bundles with linked plan, review, and trace summaries.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ limit = 10 }) => stateStore.listWorkflowBundles(limit)
    },
    {
      name: "read_workflow_run",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a workflow run by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getWorkflowBundle(id);
        if (!record) {
          throw new Error(`Unknown workflow run: ${id}`);
        }
        return record;
      }
    },
    {
      name: "export_workflow_artifact",
      description: "Export a workflow run to a markdown artifact inside the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: { type: "string" },
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ workflowId = "", title = "" }) => {
        return workflowArtifactManager.exportWorkflowArtifact({ workflowId, title });
      }
    },
    {
      name: "list_workflow_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported workflow artifact records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listWorkflowArtifacts()
    },
    {
      name: "read_workflow_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a workflow artifact by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getWorkflowArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown workflow artifact: ${id}`);
        }
        return record;
      }
    },
    {
      name: "export_bundle_index_artifact",
      description: "Export the current bundle-index summary to a markdown artifact inside the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ title = "" }) => bundleIndexArtifactManager.exportBundleIndexArtifact({ title })
    },
    {
      name: "list_bundle_index_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported bundle-index artifact records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listBundleIndexArtifacts()
    },
    {
      name: "read_bundle_index_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a bundle-index artifact by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getBundleIndexArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown bundle-index artifact: ${id}`);
        }
        return record;
      }
    },
    {
      name: "list_traces",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List recent runtime traces including model responses and tool calls.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ limit = 20 }) => stateStore.listTraces(limit)
    },
    {
      name: "list_trace_bundles",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List recent trace bundles with linked workflow and artifact context.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ limit = 10 }) => stateStore.listTraceBundles(limit)
    },
    {
      name: "read_trace",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read one persisted runtime trace by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getTraceBundle(id);
        if (!record) {
          throw new Error(`Unknown trace: ${id}`);
        }
        return record;
      }
    },
    {
      name: "export_trace_artifact",
      description: "Export recent traces or a single trace to a markdown artifact inside the configured artifact root.",
      riskLevel: "caution",
      inputSchema: {
        type: "object",
        properties: {
          traceId: { type: "string" },
          title: { type: "string" },
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ traceId = "", title = "", limit = 20 }) => {
        return traceArtifactManager.exportTraceArtifact({ traceId, title, limit });
      }
    },
    {
      name: "list_trace_artifacts",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "List exported trace artifact records.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => stateStore.listTraceArtifacts()
    },
    {
      name: "read_trace_artifact",
      readOnlyHint: true,
      concurrencySafeHint: true,
      description: "Read a trace artifact by id.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      },
      execute: async ({ id }) => {
        const record = await stateStore.getTraceArtifactBundle(id);
        if (!record) {
          throw new Error(`Unknown trace artifact: ${id}`);
        }
        return record;
      }
    }
  ];
}
