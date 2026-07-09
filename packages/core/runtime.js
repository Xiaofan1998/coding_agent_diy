import { SqliteStateStore } from "../memory/state-store.js";
import { SkillDiscovery } from "../skills/discovery.js";
import { buildRepoSnapshot } from "../context/repo-context.js";
import { ToolRegistry } from "../tools/registry.js";
import { createFileTools } from "../tools/file-tools.js";
import { createGitTools } from "../tools/git-tools.js";
import { createShellTool } from "../tools/shell-tool.js";
import { createWebTools } from "../tools/web-tools.js";
import { createStateTools } from "../tools/state-tools.js";
import { buildSystemPrompt } from "./prompt-builder.js";
import { OpenAIResponsesClient } from "../llm/openai-responses.js";
import { AnthropicMessagesClient } from "../llm/anthropic-messages.js";
import { MockResponsesClient } from "../llm/mock-model.js";
import { LocalFallbackAgent } from "../llm/local-fallback.js";
import { stringifyCompact } from "../shared/json.js";
import { SubagentManager } from "../subagents/manager.js";
import { ReviewManager } from "../reviews/manager.js";
import { ReviewArtifactManager } from "../reviews/artifact-manager.js";
import { PlanArtifactManager } from "../plans/manager.js";
import { WorkspaceSnapshotManager } from "../workspace/snapshot-manager.js";
import { WorkflowManager } from "../workflows/manager.js";
import { WorkflowArtifactManager } from "../workflows/artifact-manager.js";
import { TraceArtifactManager } from "../traces/artifact-manager.js";
import { DashboardArtifactManager } from "../dashboard/artifact-manager.js";
import { BundleIndexArtifactManager } from "../bundles/artifact-manager.js";
import { ApprovalArtifactManager } from "../approvals/artifact-manager.js";
import { StateSnapshotArtifactManager } from "../state-export/artifact-manager.js";
import { ToolPolicyError, assertToolAllowed, getEffectiveToolPolicy, enrichErrorWithRecovery } from "./tool-governance.js";
import { buildWorkingMemory } from "./working-memory.js";
import { resolveStrategyProfile } from "./strategy-mode.js";
import { runAgentLoop } from "./agent-loop.js";
import crypto from "node:crypto";

export class AgentRuntime {
  constructor({
    config,
    stateStore,
    skillDiscovery,
    toolRegistry,
    modelClient,
    subagentManager,
    reviewManager,
    planArtifactManager,
    reviewArtifactManager,
    workspaceSnapshotManager,
    workflowManager,
    workflowArtifactManager,
    traceArtifactManager,
    dashboardArtifactManager,
    bundleIndexArtifactManager,
    fallbackAgent,
    isSubagent = false
  }) {
    this.config = config;
    this.stateStore = stateStore;
    this.skillDiscovery = skillDiscovery;
    this.toolRegistry = toolRegistry;
    this.modelClient = modelClient;
    this.subagentManager = subagentManager;
    this.reviewManager = reviewManager;
    this.planArtifactManager = planArtifactManager;
    this.reviewArtifactManager = reviewArtifactManager;
    this.workspaceSnapshotManager = workspaceSnapshotManager;
    this.workflowManager = workflowManager;
    this.workflowArtifactManager = workflowArtifactManager;
    this.traceArtifactManager = traceArtifactManager;
    this.dashboardArtifactManager = dashboardArtifactManager;
    this.bundleIndexArtifactManager = bundleIndexArtifactManager;
    this.fallbackAgent = fallbackAgent;
    this.isSubagent = isSubagent;
    this.pendingSteeringMessages = [];
    this.pendingFollowUpMessages = [];
  }

  static async create(config, options = {}) {
    const stateStore = await SqliteStateStore.create(config);
    const runtimeOverrides = await stateStore.getRuntimeSettings();
    const envRuntimeOverrides = buildExplicitEnvRuntimeOverrides();
    if (runtimeOverrides.strategyMode) {
      const profile = resolveStrategyProfile(runtimeOverrides.strategyMode);
      config.runtime = {
        ...config.runtime,
        ...profile,
        ...runtimeOverrides,
        ...envRuntimeOverrides
      };
    } else if (Object.keys(runtimeOverrides).length > 0 || Object.keys(envRuntimeOverrides).length > 0) {
      config.runtime = {
        ...config.runtime,
        ...runtimeOverrides,
        ...envRuntimeOverrides
      };
    }
    const skillDiscovery = new SkillDiscovery(config);
    const modelClient = config.openai.mockMode
      ? new MockResponsesClient(config)
      : createModelClient(config);

    const runtimeFactory = async ({ subagent = false, allowedTools = [] } = {}) => {
      return AgentRuntime.create(config, {
        isSubagent: subagent,
        allowedTools
      });
    };

    const reviewManager = new ReviewManager({
      stateStore,
      config
    });
    const planArtifactManager = new PlanArtifactManager({
      config,
      stateStore
    });
    const reviewArtifactManager = new ReviewArtifactManager({
      config,
      stateStore
    });
    const workspaceSnapshotManager = new WorkspaceSnapshotManager({
      config,
      stateStore
    });
    const subagentManager = new SubagentManager({
      config,
      runtimeFactory,
      stateStore,
      workspaceSnapshotManager
    });
    const traceArtifactManager = new TraceArtifactManager({
      config,
      stateStore
    });
    const dashboardArtifactManager = new DashboardArtifactManager({
      config,
      stateStore
    });
    const bundleIndexArtifactManager = new BundleIndexArtifactManager({
      config,
      stateStore
    });
    const approvalArtifactManager = new ApprovalArtifactManager({
      config,
      stateStore
    });
    const stateSnapshotArtifactManager = new StateSnapshotArtifactManager({
      config,
      stateStore
    });
    const workflowManager = new WorkflowManager({
      stateStore,
      subagentManager,
      planArtifactManager,
      reviewManager,
      reviewArtifactManager,
      traceArtifactManager
    });
    const workflowArtifactManager = new WorkflowArtifactManager({
      config,
      stateStore
    });

    const tools = [
      ...createFileTools(config),
      ...createGitTools(config),
      createShellTool(config),
      ...createWebTools(config),
      ...createStateTools(
        config,
        stateStore,
        skillDiscovery,
        subagentManager,
        reviewManager,
        planArtifactManager,
        reviewArtifactManager,
        workspaceSnapshotManager,
        workflowManager,
        workflowArtifactManager,
        traceArtifactManager,
        dashboardArtifactManager,
        bundleIndexArtifactManager,
        approvalArtifactManager,
        stateSnapshotArtifactManager
      )
    ];

    const allowedTools = options.allowedTools?.length
      ? tools.filter((tool) => options.allowedTools.includes(tool.name))
      : tools;

    const toolRegistry = new ToolRegistry(allowedTools);
    const runtime = new AgentRuntime({
      config,
      stateStore,
      skillDiscovery,
      toolRegistry,
      modelClient,
      subagentManager,
      reviewManager,
      planArtifactManager,
      reviewArtifactManager,
      workspaceSnapshotManager,
      workflowManager,
      workflowArtifactManager,
      traceArtifactManager,
      dashboardArtifactManager,
      bundleIndexArtifactManager,
      fallbackAgent: null,
      isSubagent: options.isSubagent || false
    });

    runtime.fallbackAgent = new LocalFallbackAgent({
      config,
      toolRegistry,
      stateStore,
      skillDiscovery,
      subagentManager,
      planArtifactManager,
      executeTool: (name, args) => runtime.executeTool(name, args)
    });

    return runtime;
  }

  async runUserTurn(userMessage) {
    if (!this.isSubagent) {
      await this.stateStore.incrementGoalTurn();
    }
    return this.runTurn(userMessage, "user");
  }

  async runSyntheticTurn(userMessage) {
    return this.runTurn(userMessage, "developer");
  }

  enqueueSteeringMessage(message) {
    if (message && typeof message === "object" && typeof message.role === "string") {
      this.pendingSteeringMessages.push({
        role: message.role,
        content: message.content
      });
    }
  }

  enqueueFollowUpMessage(message) {
    if (message && typeof message === "object" && typeof message.role === "string") {
      this.pendingFollowUpMessages.push({
        role: message.role,
        content: message.content
      });
    }
  }

  async takeSteeringMessages() {
    const messages = [...this.pendingSteeringMessages];
    this.pendingSteeringMessages = [];
    return messages;
  }

  async takeFollowUpMessages() {
    const messages = [...this.pendingFollowUpMessages];
    this.pendingFollowUpMessages = [];
    return messages;
  }

  async executeTool(name, args = {}) {
    const tool = this.toolRegistry.get(name);
    const policy = getEffectiveToolPolicy(this.config, {
      isSubagent: this.isSubagent
    });
    const approvedOverride = await this.findApprovedToolPolicyOverride({
      toolName: name,
      args
    });
    try {
      if (!approvedOverride) {
        assertToolAllowed(tool, policy);
      } else {
        await this.stateStore.saveTrace({
          id: `trace_${crypto.randomUUID()}`,
          createdAt: new Date().toISOString(),
          kind: "approval_override_used",
          approvalRequestId: approvedOverride.id,
          toolName: name,
          isSubagent: this.isSubagent
        });
      }
      return await tool.execute(args);
    } catch (error) {
      if (error instanceof ToolPolicyError) {
        await this.createApprovalRequestForPolicyBlock({
          tool,
          args,
          policy,
          error
        });
        // Enrich blocked-tool errors with recovery hints from the tool definition
        throw enrichErrorWithRecovery(tool, error);
      }
      // For execution errors, wrap with recovery hints if available
      if (tool.errorRecovery) {
        const enriched = enrichErrorWithRecovery(tool, error instanceof Error ? error : new Error(String(error)));
        throw enriched;
      }
      throw error;
    }
  }

  async retryApprovalRequest(id) {
    const approval = await this.stateStore.getApprovalRequest(id);
    if (!approval) {
      throw new Error(`Unknown approval request: ${id}`);
    }
    if (approval.kind !== "tool_policy_gate") {
      throw new Error(`Approval request ${id} is not a retryable tool policy gate.`);
    }
    if (approval.status !== "approved") {
      throw new Error(`Approval request ${id} must be approved before retry.`);
    }

    const result = await this.executeTool(approval.toolName, approval.arguments || {});
    const updatedApproval = {
      ...approval,
      lastRetriedAt: new Date().toISOString(),
      lastRetryStatus: "succeeded",
      updatedAt: new Date().toISOString()
    };
    await this.stateStore.saveApprovalRequest(updatedApproval);
    await this.stateStore.saveTrace({
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "approval_retry_executed",
      approvalRequestId: approval.id,
      toolName: approval.toolName,
      isSubagent: this.isSubagent
    });

    return {
      approvalRequestId: approval.id,
      toolName: approval.toolName,
      arguments: approval.arguments || {},
      result
    };
  }

  async findApprovedToolPolicyOverride({ toolName, args }) {
    const approvals = await this.stateStore.listApprovalRequests();
    return approvals.find((item) => {
      return (
        item.kind === "tool_policy_gate" &&
        item.status === "approved" &&
        item.toolName === toolName &&
        JSON.stringify(item.arguments || {}) === JSON.stringify(args || {}) &&
        Boolean(item.resolvedAt)
      );
    }) || null;
  }

  async runTurn(userMessage, role) {
    const session = await this.stateStore.getSession();
    const goal = await this.stateStore.getActiveGoal();
    const activatedSkills = await this.skillDiscovery.matchSkills({
      userMessage,
      goal
    });
    const repoSnapshot = await buildRepoSnapshot(this.config, {
      query: userMessage,
      goal,
      activatedSkills
    });
    const dashboardSummary = await this.stateStore.getDashboardSummary();
    const turnId = crypto.randomUUID();

    await this.stateStore.saveTrace({
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "turn_start",
      turnId,
      role,
      userMessage,
      goal: goal?.objective || null,
      activatedSkills: activatedSkills.map((skill) => skill.name)
    });

    if (!this.config.openai.apiKey && !this.config.openai.mockMode) {
      const fallback = await this.fallbackAgent.run({
        userMessage,
        goal,
        session,
        repoSnapshot,
        activatedSkills,
        isSubagent: this.isSubagent
      });

      const governedMessage = await this.applyGoalGovernanceAfterTurn({
        goal,
        turnId,
        finalMessage: fallback.message
      });
      const governedSummary = buildWorkingMemory({
        conversation: [
        ...toConversationTurns(session.turns),
        {
          role,
          content: userMessage
        },
        {
          role: "assistant",
          content: governedMessage
        }
        ],
        goal: await this.stateStore.getActiveGoal(),
        planItems: session.activePlanItems || [],
        repoSnapshot,
        activatedSkills
      });
      await this.stateStore.appendTurn({
        createdAt: new Date().toISOString(),
        userMessage,
        role,
        response: governedMessage
      });
      await this.stateStore.saveSummary(governedSummary);
      await this.stateStore.saveTrace({
        id: `trace_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        kind: "turn_end",
        turnId,
        response: governedMessage,
        mode: "fallback"
      });

      return {
        ...fallback,
        message: governedMessage
      };
    }

    const systemPrompt = await buildSystemPrompt({
      config: this.config,
      toolRegistry: this.toolRegistry,
      session,
      goal,
      repoSnapshot,
      activatedSkills,
      dashboardSummary
    });

    const conversation = [
      ...toConversationTurns(session.turns),
      {
        role,
        content: userMessage
      }
    ];

    const suggestedFirstTools = dashboardSummary?.suggestedFirstTools || [];
    let finalMessage = "No response generated.";
    try {
      const loopResult = await runAgentLoop({
        modelClient: this.modelClient,
        systemPrompt,
        conversation,
        toolRegistry: this.toolRegistry,
        config: this.config,
        suggestedFirstTools,
        createTrace: async (payload) => {
          await this.stateStore.saveTrace({
            id: `trace_${crypto.randomUUID()}`,
            createdAt: new Date().toISOString(),
            turnId,
            ...payload
          });
        },
        executeTool: (name, args) => this.executeTool(name, args),
        getSteeringMessages: () => this.takeSteeringMessages(),
        getFollowUpMessages: () => this.takeFollowUpMessages()
      });
      finalMessage = loopResult.finalMessage;
    } catch (error) {
      return this.handleModelFailureFallback({
        error,
        turnId,
        role,
        userMessage,
        goal,
        session,
        repoSnapshot,
        activatedSkills
      });
    }

    const planItems = !this.isSubagent ? await this.stateStore.getPlanItems() : [];
    const openApprovals = !this.isSubagent ? await this.stateStore.listOpenApprovalRequests() : [];
    let workflowRun = null;
    if (
      this.config.runtime.autoRunDeliveryWorkflow &&
      !this.isSubagent &&
      planItems.length > 0 &&
      planItems.every((item) => item.status === "completed") &&
      openApprovals.length === 0
    ) {
      workflowRun = await this.workflowManager.runDeliveryWorkflow({
        title: goal?.objective || "auto delivery workflow"
      });
      await this.stateStore.saveTrace({
        id: `trace_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        kind: "workflow_auto_run",
        turnId,
        workflowRunId: workflowRun.id,
        title: workflowRun.title,
        status: workflowRun.status
      });
      finalMessage = `${finalMessage}\n\nAuto workflow run: ${workflowRun.id}`;
      if ((workflowRun.approvalRequests || []).length > 0) {
        finalMessage = `${finalMessage}\nPending approvals: ${(workflowRun.approvalRequests || []).map((item) => item.id).join(", ")}. Review and resolve them before treating this task as fully complete.`;
      }
    } else if (
      this.config.runtime.autoRunDeliveryWorkflow &&
      !this.isSubagent &&
      planItems.length > 0 &&
      planItems.every((item) => item.status === "completed") &&
      openApprovals.length > 0
    ) {
      finalMessage = `${finalMessage}\n\nAuto workflow skipped because there are pending approval requests: ${openApprovals.map((item) => item.id).join(", ")}. Resolve them before continuing automatic delivery.`;
    }
    finalMessage = await this.applyGoalGovernanceAfterTurn({
      goal,
      turnId,
      finalMessage
    });
    const refreshedGoal = await this.stateStore.getActiveGoal();
    const finalConversation = [
      ...conversation.slice(0, -1),
      {
        role: "assistant",
        content: finalMessage
      }
    ];
    const summary = buildWorkingMemory({
      conversation: finalConversation,
      goal: refreshedGoal,
      planItems: session.activePlanItems || [],
      repoSnapshot,
      activatedSkills
    });
    await this.stateStore.appendTurn({
      createdAt: new Date().toISOString(),
      userMessage,
      role,
      response: finalMessage
    });
    await this.stateStore.saveSummary(summary);
    await this.stateStore.saveTrace({
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "turn_end",
      turnId,
      response: finalMessage,
      mode: "model",
      workflowRunId: workflowRun?.id || null
    });

    return {
      message: finalMessage
    };
  }

  async applyGoalGovernanceAfterTurn({ goal, turnId, finalMessage }) {
    if (this.isSubagent || !goal) {
      return finalMessage;
    }

    const blocker = await this.detectGoalBlocker();
    if (!blocker) {
      const clearedGoal = await this.stateStore.clearGoalBlocker(goal.id);
      if ((goal.blockCount || 0) > 0 || goal.lastBlockerCode) {
        await this.stateStore.saveTrace({
          id: `trace_${crypto.randomUUID()}`,
          createdAt: new Date().toISOString(),
          kind: "goal_blocker_cleared",
          turnId,
          goalId: goal.id,
          previousBlockCount: goal.blockCount || 0
        });
      }
      return finalMessage;
    }

    const updatedGoal = await this.stateStore.recordGoalBlocker(blocker);
    await this.stateStore.saveTrace({
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "goal_blocker_observed",
      turnId,
      goalId: goal.id,
      blockerCode: blocker.code,
      blockerMessage: blocker.message,
      blockCount: updatedGoal?.blockCount || 0,
      status: updatedGoal?.status || goal.status
    });

    if (updatedGoal?.status === "blocked" && goal.status !== "blocked") {
      await this.stateStore.saveTrace({
        id: `trace_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        kind: "goal_blocked",
        turnId,
        goalId: goal.id,
        blockerCode: blocker.code,
        blockerMessage: blocker.message,
        blockCount: updatedGoal.blockCount
      });
      return [
        finalMessage,
        "",
        `Goal governance update: active goal ${goal.id} is now blocked after repeated blocker "${blocker.code}" (${updatedGoal.blockCount} consecutive turn(s)).`,
        blocker.message
      ].join("\n");
    }

    return finalMessage;
  }

  async detectGoalBlocker() {
    const [openApprovals, planItems, latestWorkflow] = await Promise.all([
      this.stateStore.listOpenApprovalRequests(),
      this.stateStore.getPlanItems(),
      this.stateStore.listWorkflowRuns().then((items) => items[0] || null)
    ]);

    if (openApprovals.length > 0) {
      return {
        code: "approval_pending",
        message: `Pending approvals are blocking progress: ${openApprovals.map((item) => item.id).join(", ")}.`
      };
    }

    if (latestWorkflow?.statusReasons?.some((item) => item.code === "governance_hold")) {
      const governanceReason = latestWorkflow.statusReasons.find((item) => item.code === "governance_hold");
      return {
        code: "governance_hold",
        message: governanceReason?.message || "Workflow governance hold is blocking autonomous progress."
      };
    }

    const blockedPlanItems = planItems.filter((item) => item.status === "blocked");
    if (blockedPlanItems.length > 0) {
      return {
        code: "plan_blocked",
        message: `Blocked plan items remain: ${blockedPlanItems.slice(0, 3).map((item) => item.content).join(" | ")}${blockedPlanItems.length > 3 ? " ..." : ""}`
      };
    }

    return null;
  }

  async handleModelFailureFallback({ error, turnId, role, userMessage, goal, session, repoSnapshot, activatedSkills }) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.stateStore.saveTrace({
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "model_error",
      turnId,
      error: errorMessage,
      model: this.config.openai.model
    });

    const fallback = await this.fallbackAgent.run({
      userMessage,
      goal,
      session,
      repoSnapshot,
      activatedSkills,
      isSubagent: this.isSubagent
    });
    const composedMessage = [
      `Model request failed, so the agent used local fallback mode instead: ${errorMessage}`,
      "",
      fallback.message
    ].join("\n");
    const governedMessage = await this.applyGoalGovernanceAfterTurn({
      goal,
      turnId,
      finalMessage: composedMessage
    });
    const refreshedGoal = await this.stateStore.getActiveGoal();
    const summary = buildWorkingMemory({
      conversation: [
        ...toConversationTurns(session.turns),
        {
          role,
          content: userMessage
        },
        {
          role: "assistant",
          content: governedMessage
        }
      ],
      goal: refreshedGoal,
      planItems: session.activePlanItems || [],
      repoSnapshot,
      activatedSkills
    });
    await this.stateStore.appendTurn({
      createdAt: new Date().toISOString(),
      userMessage,
      role,
      response: governedMessage
    });
    await this.stateStore.saveSummary(summary);
    await this.stateStore.saveTrace({
      id: `trace_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      kind: "turn_end",
      turnId,
      response: governedMessage,
      mode: "fallback_after_model_error"
    });

    return {
      message: governedMessage
    };
  }
}

function createModelClient(config) {
  if (config.anthropic?.authToken && config.anthropic?.baseUrl) {
    return new AnthropicMessagesClient(config);
  }
  return new OpenAIResponsesClient(config);
}

function buildExplicitEnvRuntimeOverrides() {
  const overrides = {};
  if (process.env.CODE_AGENT_MAX_TOOL_RISK) {
    overrides.maxToolRisk = process.env.CODE_AGENT_MAX_TOOL_RISK;
  }
  if (process.env.CODE_AGENT_SUBAGENT_MAX_TOOL_RISK) {
    overrides.subagentMaxToolRisk = process.env.CODE_AGENT_SUBAGENT_MAX_TOOL_RISK;
  }
  if (Object.hasOwn(process.env, "CODE_AGENT_AUTO_WORKFLOW")) {
    overrides.autoRunDeliveryWorkflow = process.env.CODE_AGENT_AUTO_WORKFLOW === "1";
  }
  if (Object.hasOwn(process.env, "CODE_AGENT_ENFORCE_SUGGESTED_FIRST_TOOL")) {
    overrides.enforceSuggestedFirstTool = process.env.CODE_AGENT_ENFORCE_SUGGESTED_FIRST_TOOL === "1";
  }
  if (Object.hasOwn(process.env, "CODE_AGENT_REQUIRE_CONFIRM_WRITE")) {
    overrides.requireConfirmationForWrite = process.env.CODE_AGENT_REQUIRE_CONFIRM_WRITE === "1";
  }
  if (Object.hasOwn(process.env, "CODE_AGENT_REQUIRE_CONFIRM_RESTRICTED")) {
    overrides.requireConfirmationForRestricted = process.env.CODE_AGENT_REQUIRE_CONFIRM_RESTRICTED !== "0";
  }
  return overrides;
}

function toConversationTurns(turns) {
  return turns.flatMap((turn) => [
    {
      role: turn.role || "user",
      content: turn.userMessage
    },
    {
      role: "assistant",
      content: turn.response
    }
  ]);
}

AgentRuntime.prototype.createApprovalRequestForPolicyBlock = async function createApprovalRequestForPolicyBlock({
  tool,
  args,
  policy,
  error
}) {
  const existingOpen = await this.stateStore.listOpenApprovalRequests();
  const duplicate = existingOpen.find((item) => {
    return (
      item.kind === "tool_policy_gate" &&
      item.toolName === tool.name &&
      item.policyReason === error.details?.policyReason &&
      JSON.stringify(item.arguments || {}) === JSON.stringify(args || {})
    );
  });

  if (duplicate) {
    return duplicate;
  }

  const createdAt = new Date().toISOString();
  const approval = {
    id: `approval_${crypto.randomUUID()}`,
    createdAt,
    updatedAt: createdAt,
    status: "pending",
    kind: "tool_policy_gate",
    title: `Policy gate for tool ${tool.name}`,
    summary: buildPolicyGateSummary(tool.name, args, error.details?.policyReason),
    toolName: tool.name,
    toolRisk: tool.riskLevel || "safe",
    arguments: args,
    changeSummary: summarizeToolArguments(tool.name, args),
    policyReason: error.details?.policyReason || "policy_block",
    maxRisk: policy.maxRiskLevel,
    isSubagent: this.isSubagent
  };

  await this.stateStore.saveApprovalRequest(approval);
  await this.stateStore.saveTrace({
    id: `trace_${crypto.randomUUID()}`,
    createdAt,
    kind: "approval_requested",
    approvalRequestId: approval.id,
    toolName: tool.name,
    policyReason: approval.policyReason,
    isSubagent: this.isSubagent
  });

  return approval;
};

function buildPolicyGateSummary(toolName, args, policyReason) {
  const actionSummary = summarizeToolArguments(toolName, args);
  if (actionSummary) {
    return `Tool ${toolName} was blocked by runtime policy (${policyReason || "policy_block"}). Requested action: ${actionSummary}.`;
  }
  return `Tool ${toolName} was blocked by runtime policy and needs approval or a policy change before retrying.`;
}

function summarizeToolArguments(toolName, args = {}) {
  if (toolName === "write_file") {
    const content = String(args.content || "");
    const lineCount = content ? content.split("\n").length : 0;
    return `write ${args.path || "(unknown path)"} with ${lineCount} line(s) and ${content.length} character(s)`;
  }

  if (toolName === "apply_patch") {
    const search = String(args.search || "");
    const replace = String(args.replace || "");
    return `patch ${args.path || "(unknown path)"}${args.all ? " across all matches" : ""}: "${clipSnippet(search)}" -> "${clipSnippet(replace)}"`;
  }

  if (toolName === "run_shell") {
    return `run shell command "${String(args.command || "").slice(0, 120)}"`;
  }

  return "";
}

function clipSnippet(value, maxChars = 40) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}
