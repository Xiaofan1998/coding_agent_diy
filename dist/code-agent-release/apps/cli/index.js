#!/usr/bin/env node

import { stdin as input, stdout as output } from "node:process";
import { AgentRuntime } from "../../packages/core/runtime.js";
import { loadConfig } from "../../packages/shared/config.js";
import { ReviewManager } from "../../packages/reviews/manager.js";
import { ReviewArtifactManager } from "../../packages/reviews/artifact-manager.js";
import { PlanArtifactManager } from "../../packages/plans/manager.js";
import { DashboardArtifactManager } from "../../packages/dashboard/artifact-manager.js";
import { BundleIndexArtifactManager } from "../../packages/bundles/artifact-manager.js";
import { ApprovalArtifactManager } from "../../packages/approvals/artifact-manager.js";
import { StateSnapshotArtifactManager } from "../../packages/state-export/artifact-manager.js";
import { resolveStrategyProfile, STRATEGY_PROFILES } from "../../packages/core/strategy-mode.js";
import { normalizeSkillCommandLine, promptForChatInput } from "./skill-input.js";

async function main() {
  const config = loadConfig(process.cwd());
  const runtime = await AgentRuntime.create(config);
  const reviewManager = new ReviewManager({ stateStore: runtime.stateStore, config });
  const reviewArtifactManager = new ReviewArtifactManager({ config, stateStore: runtime.stateStore });
  const planArtifactManager = new PlanArtifactManager({ config, stateStore: runtime.stateStore });
  const dashboardArtifactManager = new DashboardArtifactManager({ config, stateStore: runtime.stateStore });
  const bundleIndexArtifactManager = new BundleIndexArtifactManager({ config, stateStore: runtime.stateStore });
  const approvalArtifactManager = new ApprovalArtifactManager({ config, stateStore: runtime.stateStore });
  const stateSnapshotArtifactManager = new StateSnapshotArtifactManager({ config, stateStore: runtime.stateStore });
  const [, , command = "chat", ...rest] = process.argv;

  if (command === "run") {
    const prompt = rest.join(" ").trim();
    if (!prompt) {
      console.error("Usage: code-agent run <prompt>");
      process.exitCode = 1;
      return;
    }

    await runAndRenderTurn(runtime, prompt);
    return;
  }

  if (command === "run-events") {
    const prompt = rest.join(" ").trim();
    if (!prompt) {
      console.error("Usage: code-agent run-events <prompt>");
      process.exitCode = 1;
      return;
    }

    for await (const event of runtime.runUserTurnEvents(prompt)) {
      console.log(JSON.stringify(event));
    }
    return;
  }

  if (command === "goal") {
    await handleGoalCommand(runtime, rest);
    return;
  }

  if (command === "plan") {
    await handlePlanCommand(runtime, planArtifactManager, rest);
    return;
  }

  if (command === "skills") {
    await handleSkillsCommand(runtime, rest);
    return;
  }

  if (command === "subagents") {
    await handleSubagentsCommand(runtime, rest);
    return;
  }

  if (command === "demo") {
    await handleDemoCommand(rest);
    return;
  }

  if (command === "plan-runs") {
    await handlePlanRunsCommand(runtime, rest);
    return;
  }

  if (command === "plan-artifacts") {
    await handlePlanArtifactsCommand(runtime, rest);
    return;
  }

  if (command === "reviews") {
    await handleReviewsCommand(runtime, reviewManager, reviewArtifactManager, rest);
    return;
  }

  if (command === "approvals") {
    await handleApprovalsCommand(runtime, rest);
    return;
  }

  if (command === "review-artifacts") {
    await handleReviewArtifactsCommand(runtime, rest);
    return;
  }

  if (command === "approval-artifacts") {
    await handleApprovalArtifactsCommand(runtime, approvalArtifactManager, rest);
    return;
  }

  if (command === "repo") {
    await handleRepoCommand(runtime, rest);
    return;
  }

  if (command === "workspace") {
    await handleWorkspaceCommand(runtime, rest);
    return;
  }

  if (command === "workflow") {
    await handleWorkflowCommand(runtime, rest);
    return;
  }

  if (command === "workflow-artifacts") {
    await handleWorkflowArtifactsCommand(runtime, rest);
    return;
  }

  if (command === "traces") {
    await handleTracesCommand(runtime, rest);
    return;
  }

  if (command === "trace-artifacts") {
    await handleTraceArtifactsCommand(runtime, rest);
    return;
  }

  if (command === "config") {
    await handleConfigCommand(runtime, rest);
    return;
  }

  if (command === "dashboard") {
    await handleDashboardCommand(runtime, dashboardArtifactManager, rest);
    return;
  }

  if (command === "bundle-index") {
    await handleBundleIndexCommand(runtime, bundleIndexArtifactManager, rest);
    return;
  }

  if (command === "bundle-index-artifacts") {
    await handleBundleIndexArtifactsCommand(runtime, rest);
    return;
  }

  if (command === "dashboard-artifacts") {
    await handleDashboardArtifactsCommand(runtime, rest);
    return;
  }

  if (command === "machine-state") {
    await handleMachineStateCommand(runtime, stateSnapshotArtifactManager, rest);
    return;
  }

  if (command === "machine-state-artifacts") {
    await handleMachineStateArtifactsCommand(runtime, rest);
    return;
  }

  if (command === "session") {
    await handleSessionCommand(runtime, rest);
    return;
  }

  if (command === "strategy") {
    await handleStrategyCommand(runtime, rest);
    return;
  }

  if (command === "status") {
    console.log(JSON.stringify(await buildCliStatusSummary(runtime), null, 2));
    return;
  }

  if (command === "next") {
    console.log(await renderNextActions(runtime));
    return;
  }

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(renderCliHelp());
    return;
  }

  await startChat(runtime, reviewManager, reviewArtifactManager, planArtifactManager, dashboardArtifactManager, bundleIndexArtifactManager, approvalArtifactManager, stateSnapshotArtifactManager);
}

async function handleGoalCommand(runtime, rest) {
  const [subcommand, ...args] = rest;

  if (subcommand === "create") {
    const objective = args.join(" ").trim();
    if (!objective) {
      console.error("Usage: code-agent goal create <objective>");
      process.exitCode = 1;
      return { type: "error" };
    }

    const goal = await runtime.stateStore.createGoal(objective);
    console.log(`Created goal ${goal.id}: ${goal.objective}`);
    console.log(`Goal mode active. Type the next request normally; events will stream under this goal.`);
    return { type: "goal_mode_enter", goal };
  }

  if (subcommand === "show") {
    const id = args[0] || "";
    const goal = id ? await runtime.stateStore.getGoal(id) : await runtime.stateStore.getActiveGoal();
    console.log(goal ? JSON.stringify(goal, null, 2) : (id ? `No such goal: ${id}` : "No active goal."));
    return { type: "handled" };
  }

  if (subcommand === "list") {
    const limit = args[0] ? Number(args[0]) : 20;
    console.log(JSON.stringify(await runtime.stateStore.listGoals(Number.isFinite(limit) ? limit : 20), null, 2));
    return { type: "handled" };
  }

  if (subcommand === "complete") {
    const id = args[0] || "";
    const goal = await runtime.stateStore.updateGoalStatus("complete", id);
    console.log(goal ? `Completed goal ${goal.id}.` : (id ? `No such goal: ${id}` : "No active goal."));
    return { type: "goal_mode_exit", goal };
  }

  if (subcommand === "cancel") {
    const id = args[0] || "";
    const goal = await runtime.stateStore.updateGoalStatus("cancelled", id);
    console.log(goal ? `Cancelled goal ${goal.id}.` : (id ? `No such goal: ${id}` : "No active goal."));
    return { type: "goal_mode_exit", goal };
  }

  if (subcommand === "resume") {
    const id = args[0] || "";
    if (!id) {
      console.error("Usage: code-agent goal resume <id>");
      process.exitCode = 1;
      return { type: "error" };
    }
    const goal = await runtime.stateStore.resumeGoal(id);
    console.log(goal ? `Resumed goal ${goal.id}: ${goal.objective}` : `No such goal: ${id}`);
    if (goal) {
      console.log(`Goal mode active. Type the next request normally; events will stream under this goal.`);
      return { type: "goal_mode_enter", goal };
    }
    return { type: "handled" };
  }

  if (subcommand === "diagnose") {
    const id = args[0] || "";
    console.log(await renderGoalDiagnosis(runtime, { goalId: id }));
    return { type: "handled" };
  }

  console.error("Usage: code-agent goal <create|show [id]|list [limit]|complete [id]|cancel [id]|resume <id>|diagnose [id]>");
  process.exitCode = 1;
  return { type: "error" };
}

async function handleSessionCommand(runtime, rest) {
  const [subcommand, arg] = rest;

  if (subcommand === "show") {
    const session = await runtime.stateStore.getSession();
    console.log(JSON.stringify({
      id: session.id,
      projectRoot: session.projectRoot,
      transcriptTurnCount: session.transcriptTurnCount || 0,
      activePlanItems: session.activePlanItems
    }, null, 2));
    return;
  }

  if (subcommand === "history") {
    const limit = arg ? Number(arg) : 10;
    const transcriptTurns = await runtime.stateStore.listTranscriptTurns(Number.isFinite(limit) ? limit : 10, "desc");
    console.log(renderSessionHistory(transcriptTurns));
    return;
  }

  console.error("Usage: code-agent session <show|history [limit]>");
  process.exitCode = 1;
}

async function handleStrategyCommand(runtime, rest) {
  const [subcommand, mode] = rest;
  if (subcommand === "show") {
    console.log(JSON.stringify({
      strategyMode: runtime.config.runtime.strategyMode || "balanced",
      runtime: runtime.config.runtime
    }, null, 2));
    return;
  }
  if (subcommand === "set") {
    if (!mode || !STRATEGY_PROFILES[mode]) {
      console.error(`Usage: code-agent strategy set <${Object.keys(STRATEGY_PROFILES).join("|")}>`);
      process.exitCode = 1;
      return;
    }
    const profile = resolveStrategyProfile(mode);
    const saved = await runtime.stateStore.saveRuntimeSettings({
      strategyMode: mode,
      maxToolRisk: profile.maxToolRisk,
      subagentMaxToolRisk: profile.subagentMaxToolRisk,
      autoRunDeliveryWorkflow: profile.autoRunDeliveryWorkflow,
      enforceSuggestedFirstTool: profile.enforceSuggestedFirstTool
    });
    runtime.config.runtime = {
      ...runtime.config.runtime,
      ...saved
    };
    console.log(JSON.stringify({
      strategyMode: mode,
      runtime: runtime.config.runtime
    }, null, 2));
    return;
  }
  console.error("Usage: code-agent strategy <show|set <balanced|conservative|autonomous>>");
  process.exitCode = 1;
}

async function handlePlanCommand(runtime, planArtifactManager, rest) {
  const [subcommand, ...args] = rest;
  if (subcommand === "show") {
    console.log(JSON.stringify(await runtime.stateStore.getPlanItems(), null, 2));
    return;
  }
  if (subcommand === "summary") {
    console.log(JSON.stringify(await runtime.stateStore.getCurrentPlanSummary(), null, 2));
    return;
  }
  if (subcommand === "execute") {
    console.log(JSON.stringify(await runtime.subagentManager.runPlan({
      planItems: await runtime.stateStore.getPlanItems(),
      mode: "sequential"
    }), null, 2));
    return;
  }
  if (subcommand === "export") {
    const goal = await runtime.stateStore.getActiveGoal();
    console.log(JSON.stringify(await planArtifactManager.exportActivePlan({
      title: args.join(" ").trim(),
      goal
    }), null, 2));
    return;
  }
  if (subcommand === "set-status") {
    const [index, status] = args;
    if (!index || !status) {
      console.error("Usage: code-agent plan set-status <index> <pending|in_progress|completed|blocked|skipped>");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(await runtime.stateStore.updatePlanItemStatus(Number(index), status), null, 2));
    return;
  }
  if (subcommand === "retry") {
    const [index] = args;
    if (!index) {
      console.error("Usage: code-agent plan retry <index>");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(await runtime.stateStore.updatePlanItemStatus(Number(index), "pending"), null, 2));
    return;
  }
  if (subcommand === "skip") {
    const [index] = args;
    if (!index) {
      console.error("Usage: code-agent plan skip <index>");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(await runtime.stateStore.updatePlanItemStatus(Number(index), "skipped"), null, 2));
    return;
  }
  if (subcommand === "reset-blocked") {
    console.log(JSON.stringify(await runtime.stateStore.resetBlockedPlanItems(), null, 2));
    return;
  }
  console.error("Usage: code-agent plan <show|summary|execute|export [title]|set-status <index> <pending|in_progress|completed|blocked|skipped>|retry <index>|skip <index>|reset-blocked>");
  process.exitCode = 1;
}

async function handleSkillsCommand(runtime, rest) {
  const [subcommand] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.skillDiscovery.listSkills(), null, 2));
    return;
  }
  console.error("Usage: code-agent skills list");
  process.exitCode = 1;
}

async function handleSubagentsCommand(runtime, rest) {
  const [subcommand, id, ...args] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listSubagentRecords(), null, 2));
    return;
  }
  if (subcommand === "summary") {
    const limit = id ? Number(id) : 5;
    console.log(JSON.stringify(await runtime.stateStore.getSubagentSummary(Number.isFinite(limit) ? limit : 5), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getSubagentRecord(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such subagent record.");
    return;
  }
  if (subcommand === "set-status" && id) {
    const [status, ...noteParts] = args;
    if (!status) {
      console.error("Usage: code-agent subagents set-status <id> <pending|accepted|rejected|needs_followup> [note]");
      process.exitCode = 1;
      return;
    }
    const note = noteParts.join(" ").trim();
    const record = await runtime.stateStore.updateSubagentReviewStatus(id, status, note);
    console.log(record ? JSON.stringify(record, null, 2) : `No such subagent record: ${id}`);
    return;
  }
  if (subcommand === "run") {
    const objective = id || "";
    const context = args.join(" ").trim();
    if (!objective) {
      console.error("Usage: code-agent subagents run <objective> [context]");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(await runtime.subagentManager.runSubagent({
      objective,
      context
    }), null, 2));
    return;
  }
  if (subcommand === "run-readonly") {
    const objective = id || "";
    const context = args.join(" ").trim();
    if (!objective) {
      console.error("Usage: code-agent subagents run-readonly <objective> [context]");
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(await runtime.subagentManager.runSubagent({
      objective,
      context,
      allowedTools: ["list_files", "read_file", "search_files", "git_diff", "git_status"]
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent subagents <list|summary [limit]|show <id>|set-status <id> <pending|accepted|rejected|needs_followup> [note]|run <objective> [context]|run-readonly <objective> [context]>");
  process.exitCode = 1;
}

async function handleDemoCommand(rest) {
  const [subcommand, arg] = rest;
  if (subcommand === "preview") {
    const port = arg ? Number(arg) : 4173;
    const { spawn } = await import("node:child_process");
    const child = spawn(process.execPath, ["./apps/demo/server.js", String(port)], {
      cwd: process.cwd(),
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 0;
    });
    return new Promise(() => {});
  }
  console.error("Usage: code-agent demo preview [port]");
  process.exitCode = 1;
}

async function handlePlanRunsCommand(runtime, rest) {
  const [subcommand, id] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listPlanRuns(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getPlanRunBundle(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such plan run.");
    return;
  }
  console.error("Usage: code-agent plan-runs <list|show <id>>");
  process.exitCode = 1;
}

async function handlePlanArtifactsCommand(runtime, rest) {
  const [subcommand, id] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listPlanArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getPlanArtifactBundle(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such plan artifact.");
    return;
  }
  console.error("Usage: code-agent plan-artifacts <list|show <id>>");
  process.exitCode = 1;
}

async function handleReviewsCommand(runtime, reviewManager, reviewArtifactManager, rest) {
  const [subcommand, arg, ...more] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listReviews(), null, 2));
    return;
  }
  if (subcommand === "bundles") {
    const limit = arg ? Number(arg) : 5;
    console.log(JSON.stringify(await runtime.stateStore.listReviewBundles(limit), null, 2));
    return;
  }
  if (subcommand === "show" && arg) {
    const record = await runtime.stateStore.getReviewBundle(arg);
    console.log(record ? JSON.stringify(record, null, 2) : "No such review.");
    return;
  }
  if (subcommand === "run") {
    const kind = arg || "plan";
    const result = await runNamedReview(reviewManager, kind);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (subcommand === "export") {
    console.log(JSON.stringify(await reviewArtifactManager.exportReviewArtifact({
      reviewId: arg || "",
      title: more.join(" ").trim()
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent reviews <list|bundles [limit]|show <id>|run <plan|subagents|session|repo|code|strategy|approval>|export [reviewId] [title]>");
  process.exitCode = 1;
}

async function handleReviewArtifactsCommand(runtime, rest) {
  const [subcommand, id] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listReviewArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getReviewArtifactBundle(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such review artifact.");
    return;
  }
  console.error("Usage: code-agent review-artifacts <list|show <id>>");
  process.exitCode = 1;
}

async function handleApprovalsCommand(runtime, rest) {
  const [subcommand, id, ...args] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listApprovalRequests(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getApprovalRequest(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such approval request.");
    return;
  }
  if ((subcommand === "approve" || subcommand === "reject") && id) {
    const status = subcommand === "approve" ? "approved" : "rejected";
    const record = await runtime.stateStore.resolveApprovalRequest(id, {
      status,
      note: args.join(" ").trim(),
      resolvedAt: new Date().toISOString()
    });
    console.log(record ? JSON.stringify(record, null, 2) : "No such approval request.");
    return;
  }
  if (subcommand === "retry" && id) {
    console.log(JSON.stringify(await runtime.retryApprovalRequest(id), null, 2));
    return;
  }
  console.error("Usage: code-agent approvals <list|show <id>|approve <id> [note]|reject <id> [note]|retry <id>>");
  process.exitCode = 1;
}

async function handleApprovalArtifactsCommand(runtime, approvalArtifactManager, rest) {
  const [subcommand, arg, ...more] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listApprovalArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && arg) {
    const record = await runtime.stateStore.getApprovalArtifactBundle(arg);
    console.log(record ? JSON.stringify(record, null, 2) : "No such approval artifact.");
    return;
  }
  if (subcommand === "export") {
    console.log(JSON.stringify(await approvalArtifactManager.exportApprovalArtifact({
      approvalId: arg || "",
      title: more.join(" ").trim()
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent approval-artifacts <list|show <id>|export [approvalId] [title]>");
  process.exitCode = 1;
}

async function handleMachineStateCommand(runtime, stateSnapshotArtifactManager, rest) {
  const [subcommand, ...args] = rest;
  if (subcommand === "show") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.getSnapshot(), null, 2));
    return;
  }
  if (subcommand === "ui") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.getUiPayload(), null, 2));
    return;
  }
  if (subcommand === "ui-export") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.exportUiPayload({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  if (subcommand === "ui-html-export") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.exportUiHtml({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  if (subcommand === "ui-demo-export") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.exportUiDemo({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  if (subcommand === "summary") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.getSummary(), null, 2));
    return;
  }
  if (subcommand === "index") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.getArtifactIndex(), null, 2));
    return;
  }
  if (subcommand === "index-export") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.exportArtifactIndex({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  if (subcommand === "demo-export") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.exportDemoOverview({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  if (subcommand === "schema") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.getSchema(), null, 2));
    return;
  }
  if (subcommand === "diff") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.diffSnapshots({
      fromId: args[0] || "",
      toId: args[1] || ""
    }), null, 2));
    return;
  }
  if (subcommand === "export") {
    console.log(JSON.stringify(await stateSnapshotArtifactManager.exportSnapshot({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent machine-state <show|ui|ui-export [title]|ui-html-export [title]|ui-demo-export [title]|summary|index|index-export [title]|demo-export [title]|schema|diff [fromId] [toId]|export [title]>");
  process.exitCode = 1;
}

async function handleMachineStateArtifactsCommand(runtime, rest) {
  const [subcommand, id] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listStateSnapshotArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getStateSnapshotArtifactBundle(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such machine-state artifact.");
    return;
  }
  console.error("Usage: code-agent machine-state-artifacts <list|show <id>>");
  process.exitCode = 1;
}

async function handleRepoCommand(runtime, rest) {
  const [subcommand, target] = rest;
  if (subcommand === "status") {
    const [repoSnapshot, gitStatus, gitLog] = await Promise.all([
      import("../../packages/context/repo-context.js").then((mod) => mod.buildRepoSnapshot(runtime.config)),
      runtime.executeTool("git_status", {}),
      runtime.executeTool("git_log", { limit: 5 })
    ]);

    console.log(
      JSON.stringify(
        {
          projectRoot: repoSnapshot.projectRoot,
          isGitRepo: repoSnapshot.isGitRepo,
          gitStatusSummary: repoSnapshot.gitStatusSummary,
          sourceFiles: repoSnapshot.sourceFiles.slice(0, 20),
          gitStatusTool: gitStatus,
          gitLogTool: gitLog
        },
        null,
        2
      )
    );
    return;
  }
  if (subcommand === "diff") {
    console.log(JSON.stringify(await runtime.executeTool("git_diff", { target: target || "" }), null, 2));
    return;
  }
  if (subcommand === "log") {
    console.log(JSON.stringify(await runtime.executeTool("git_log", { limit: target ? Number(target) : 5 }), null, 2));
    return;
  }
  console.error("Usage: code-agent repo <status|diff [path]|log [limit]>");
  process.exitCode = 1;
}

async function handleWorkspaceCommand(runtime, rest) {
  const [subcommand, ...args] = rest;
  if (subcommand === "snapshot") {
    console.log(JSON.stringify(await runtime.workspaceSnapshotManager.captureSnapshot({
      label: args.join(" ").trim()
    }), null, 2));
    return;
  }
  if (subcommand === "snapshots") {
    console.log(JSON.stringify(await runtime.stateStore.listWorkspaceSnapshots(), null, 2));
    return;
  }
  if (subcommand === "diff") {
    console.log(JSON.stringify(await runtime.workspaceSnapshotManager.diffSnapshots({
      fromId: args[0] || "",
      toId: args[1] || ""
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent workspace <snapshot [label]|snapshots|diff [fromId] [toId]>");
  process.exitCode = 1;
}

async function handleWorkflowCommand(runtime, rest) {
  const [subcommand, ...args] = rest;
  if (subcommand === "run") {
    console.log(JSON.stringify(await runtime.workflowManager.runDeliveryWorkflow({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listWorkflowRuns(), null, 2));
    return;
  }
  if (subcommand === "bundles") {
    const limit = args[0] ? Number(args[0]) : 5;
    console.log(JSON.stringify(await runtime.stateStore.listWorkflowBundles(limit), null, 2));
    return;
  }
  if (subcommand === "show" && args[0]) {
    const record = await runtime.stateStore.getWorkflowBundle(args[0]);
    console.log(record ? JSON.stringify(record, null, 2) : "No such workflow run.");
    return;
  }
  if (subcommand === "export") {
    console.log(JSON.stringify(await runtime.workflowArtifactManager.exportWorkflowArtifact({
      workflowId: args[0] || "",
      title: args.slice(1).join(" ").trim()
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent workflow <run [title]|list|bundles [limit]|show <id>>");
  process.exitCode = 1;
}

async function handleWorkflowArtifactsCommand(runtime, rest) {
  const [subcommand, id] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listWorkflowArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getWorkflowArtifactBundle(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such workflow artifact.");
    return;
  }
  console.error("Usage: code-agent workflow-artifacts <list|show <id>>");
  process.exitCode = 1;
}

async function handleTracesCommand(runtime, rest) {
  const [subcommand, arg] = rest;
  if (subcommand === "list") {
    const limit = arg ? Number(arg) : 20;
    console.log(JSON.stringify(await runtime.stateStore.listTraces(limit), null, 2));
    return;
  }
  if (subcommand === "bundles") {
    const limit = arg ? Number(arg) : 5;
    console.log(JSON.stringify(await runtime.stateStore.listTraceBundles(limit), null, 2));
    return;
  }
  if (subcommand === "show" && arg) {
    const record = await runtime.stateStore.getTraceBundle(arg);
    console.log(record ? JSON.stringify(record, null, 2) : "No such trace.");
    return;
  }
  console.error("Usage: code-agent traces <list [limit]|bundles [limit]|show <id>>");
  process.exitCode = 1;
}

async function handleTraceArtifactsCommand(runtime, rest) {
  const [subcommand, arg, ...more] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listTraceArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && arg) {
    const record = await runtime.stateStore.getTraceArtifactBundle(arg);
    console.log(record ? JSON.stringify(record, null, 2) : "No such trace artifact.");
    return;
  }
  if (subcommand === "export") {
    const workflowFlagIndex = more.findIndex((item) => item === "--workflow");
    const workflowId = workflowFlagIndex >= 0 ? more[workflowFlagIndex + 1] || "" : "";
    const filteredTitleParts = workflowFlagIndex >= 0
      ? more.filter((_, index) => index !== workflowFlagIndex && index !== workflowFlagIndex + 1)
      : more;
    console.log(JSON.stringify(await runtime.traceArtifactManager.exportTraceArtifact({
      traceId: arg || "",
      workflowId,
      title: filteredTitleParts.join(" ").trim(),
      limit: 20
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent trace-artifacts <list|show <id>|export [traceId] [title] [--workflow <workflowId>]>");
  process.exitCode = 1;
}

async function handleConfigCommand(runtime, rest) {
  const [subcommand] = rest;
  if (subcommand === "show") {
    console.log(
      JSON.stringify(
        {
          projectRoot: runtime.config.projectRoot,
          workspaceRoots: runtime.config.workspaceRoots,
          allowPaths: runtime.config.allowPaths,
          stateDir: runtime.config.stateDir,
          provider: "openai-chat-completions",
          baseUrl: runtime.config.openai.baseUrl,
          model: runtime.config.openai.model,
          maxTokens: runtime.config.openai.maxTokens,
          maxCompletionTokens: runtime.config.openai.maxCompletionTokens,
          openaiConfigured: Boolean(runtime.config.openai.apiKey),
          envFileLoaded: runtime.config.env?.loaded || false,
          envFileLoadedKeys: runtime.config.env?.loadedKeys || [],
          strategyMode: runtime.config.runtime.strategyMode || "balanced",
          autoRunDeliveryWorkflow: runtime.config.runtime.autoRunDeliveryWorkflow,
          enforceSuggestedFirstTool: runtime.config.runtime.enforceSuggestedFirstTool,
          maxStepsPerTurn: runtime.config.runtime.maxStepsPerTurn,
          maxToolOutputChars: runtime.config.runtime.maxToolOutputChars
        },
        null,
        2
      )
    );
    return;
  }
  console.error("Usage: code-agent config show");
  process.exitCode = 1;
}

async function handleDashboardCommand(runtime, dashboardArtifactManager, rest) {
  const [subcommand, ...args] = rest;
  if (subcommand === "show") {
    console.log(JSON.stringify(await buildCliStatusSummary(runtime), null, 2));
    return;
  }
  if (subcommand === "export") {
    console.log(JSON.stringify(await dashboardArtifactManager.exportDashboardArtifact({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent dashboard <show|export [title]>");
  process.exitCode = 1;
}

async function handleDashboardArtifactsCommand(runtime, rest) {
  const [subcommand, id] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listDashboardArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getDashboardArtifactBundle(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such dashboard artifact.");
    return;
  }
  console.error("Usage: code-agent dashboard-artifacts <list|show <id>>");
  process.exitCode = 1;
}

async function handleBundleIndexCommand(runtime, bundleIndexArtifactManager, rest) {
  const [subcommand, ...args] = rest;
  if (subcommand === "show") {
    console.log(JSON.stringify(await runtime.stateStore.getBundleIndexSummary(), null, 2));
    return;
  }
  if (subcommand === "export") {
    console.log(JSON.stringify(await bundleIndexArtifactManager.exportBundleIndexArtifact({
      title: args.join(" ").trim()
    }), null, 2));
    return;
  }
  console.error("Usage: code-agent bundle-index <show|export [title]>");
  process.exitCode = 1;
}

async function handleBundleIndexArtifactsCommand(runtime, rest) {
  const [subcommand, id] = rest;
  if (subcommand === "list") {
    console.log(JSON.stringify(await runtime.stateStore.listBundleIndexArtifacts(), null, 2));
    return;
  }
  if (subcommand === "show" && id) {
    const record = await runtime.stateStore.getBundleIndexArtifactBundle(id);
    console.log(record ? JSON.stringify(record, null, 2) : "No such bundle-index artifact.");
    return;
  }
  console.error("Usage: code-agent bundle-index-artifacts <list|show <id>>");
  process.exitCode = 1;
}

async function startChat(runtime, reviewManager, reviewArtifactManager, planArtifactManager, dashboardArtifactManager, bundleIndexArtifactManager, approvalArtifactManager, stateSnapshotArtifactManager) {
  console.log(`Coding agent ready at ${runtime.config.projectRoot}`);
  console.log("Type /help for commands.");
  console.log("Type /exit to quit.");

  let activeGoal = await runtime.stateStore.getActiveGoal();
  if (activeGoal) {
    console.log(`Goal mode active: ${activeGoal.id} — ${activeGoal.objective}`);
  }

  while (true) {
    let line;
    try {
      line = await promptForChatInput({
        input,
        output,
        skillProvider: () => runtime.skillDiscovery.listSkills(),
        modeLabel: activeGoal ? `goal:${shortId(activeGoal.id)}` : ""
      });
    } catch (error) {
      if (isReadlineClosedError(error)) {
        break;
      }
      throw error;
    }

    if (!line) {
      continue;
    }

    if (line === "/exit" || line === "/quit") {
      break;
    }

    try {
      const metaResult = await handleInteractiveMetaCommand(runtime, reviewManager, reviewArtifactManager, planArtifactManager, dashboardArtifactManager, bundleIndexArtifactManager, approvalArtifactManager, stateSnapshotArtifactManager, line);
      if (metaResult) {
        if (metaResult.type === "goal_mode_enter") {
          activeGoal = metaResult.goal;
        } else if (metaResult.type === "goal_mode_exit") {
          activeGoal = await runtime.stateStore.getActiveGoal();
        } else {
          activeGoal = await runtime.stateStore.getActiveGoal();
        }
        continue;
      }
      await runAndRenderTurn(runtime, normalizeSkillCommandLine(line));
      activeGoal = await runtime.stateStore.getActiveGoal();
    } catch (error) {
      console.error(formatError(error));
    }
  }
}


function shortId(id) {
  const value = String(id || "");
  return value.length > 10 ? value.slice(-10) : value;
}

async function handleInteractiveMetaCommand(runtime, reviewManager, reviewArtifactManager, planArtifactManager, dashboardArtifactManager, bundleIndexArtifactManager, approvalArtifactManager, stateSnapshotArtifactManager, line) {
  const [command, ...rest] = line.split(/\s+/);

  if (command === "/goal") {
    return await handleGoalCommand(runtime, rest);
  }

  if (command === "/plan") {
    await handlePlanCommand(runtime, planArtifactManager, rest);
    return true;
  }

  if (command === "/skills") {
    await handleSkillsCommand(runtime, rest);
    return true;
  }

  if (command === "/subagents") {
    await handleSubagentsCommand(runtime, rest);
    return true;
  }

  if (command === "/demo") {
    await handleDemoCommand(rest);
    return true;
  }

  if (command === "/plan-runs") {
    await handlePlanRunsCommand(runtime, rest);
    return true;
  }

  if (command === "/plan-artifacts") {
    await handlePlanArtifactsCommand(runtime, rest);
    return true;
  }

  if (command === "/reviews") {
    await handleReviewsCommand(runtime, reviewManager, reviewArtifactManager, rest);
    return true;
  }

  if (command === "/review-artifacts") {
    await handleReviewArtifactsCommand(runtime, rest);
    return true;
  }

  if (command === "/approvals") {
    await handleApprovalsCommand(runtime, rest);
    return true;
  }

  if (command === "/approval-artifacts") {
    await handleApprovalArtifactsCommand(runtime, approvalArtifactManager, rest);
    return true;
  }

  if (command === "/repo") {
    await handleRepoCommand(runtime, rest);
    return true;
  }

  if (command === "/workspace") {
    await handleWorkspaceCommand(runtime, rest);
    return true;
  }

  if (command === "/workflow") {
    await handleWorkflowCommand(runtime, rest);
    return true;
  }

  if (command === "/workflow-artifacts") {
    await handleWorkflowArtifactsCommand(runtime, rest);
    return true;
  }

  if (command === "/traces") {
    await handleTracesCommand(runtime, rest);
    return true;
  }

  if (command === "/trace-artifacts") {
    await handleTraceArtifactsCommand(runtime, rest);
    return true;
  }

  if (command === "/config") {
    await handleConfigCommand(runtime, rest);
    return true;
  }

  if (command === "/dashboard") {
    await handleDashboardCommand(runtime, dashboardArtifactManager, rest);
    return true;
  }

  if (command === "/bundle-index") {
    await handleBundleIndexCommand(runtime, bundleIndexArtifactManager, rest);
    return true;
  }

  if (command === "/bundle-index-artifacts") {
    await handleBundleIndexArtifactsCommand(runtime, rest);
    return true;
  }

  if (command === "/dashboard-artifacts") {
    await handleDashboardArtifactsCommand(runtime, rest);
    return true;
  }

  if (command === "/machine-state") {
    await handleMachineStateCommand(runtime, stateSnapshotArtifactManager, rest);
    return true;
  }

  if (command === "/machine-state-artifacts") {
    await handleMachineStateArtifactsCommand(runtime, rest);
    return true;
  }

  if (command === "/session") {
    await handleSessionCommand(runtime, rest);
    return true;
  }

  if (command === "/strategy") {
    await handleStrategyCommand(runtime, rest);
    return true;
  }

  if (command === "/status") {
    console.log(JSON.stringify(await buildCliStatusSummary(runtime), null, 2));
    return true;
  }

  if (command === "/next") {
    console.log(await renderNextActions(runtime));
    return true;
  }

  if (command === "/help") {
    console.log(renderCliHelp({ interactive: true }));
    return true;
  }

  return false;
}

async function runNamedReview(reviewManager, kind) {
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

async function runAndRenderTurn(runtime, prompt) {
  let printedFinal = false;

  for await (const event of runtime.runUserTurnEvents(prompt)) {
    if (event.type === "assistant_final") {
      console.log(renderFinalAnswer(event.content || ""));
      printedFinal = true;
      continue;
    }

    if (event.type === "turn_result") {
      if (!printedFinal && event.message) {
        console.log(renderFinalAnswer(event.message));
        printedFinal = true;
      }
      continue;
    }

    const rendered = renderRuntimeEvent(event);
    if (rendered) {
      console.log(rendered);
    }
  }
}

function renderFinalAnswer(content) {
  return `\n━━ Final answer ━━\n${content}`;
}

function renderRuntimeEvent(event) {
  switch (event.type) {
    case "turn_start":
      return `\n━━ Agent turn ${event.turnId || ""} ━━`;
    case "context_microcompact":
      return `◌ context microcompacted: ${event.beforeChars ?? "?"} → ${event.afterChars ?? "?"} chars (threshold ${event.thresholdChars ?? "?"})`;
    case "context_compact":
      return `⬢ context compacted · source=${event.source || "traditional"} · ${event.beforeChars ?? "?"} → ${event.afterChars ?? "?"} chars (threshold ${event.thresholdChars ?? "?"})`;
    case "session_memory_extracted":
      return `◈ session memory extracted · ${event.currentTokens ?? "?"} tokens · ${event.path || "summary.md"}`;
    case "loop_start":
      return `↻ loop started`;
    case "loop_messages_injected":
      return `＋ injected ${event.count ?? 0} ${event.source || "runtime"} message(s)`;
    case "memory_context_injected":
      return `＋ memory context injected · ${event.count ?? 0} item(s)`;
    case "model_request_start":
      return `⇢ model request`;
    case "model_response": {
      const callCount = Number.isFinite(event.functionCallCount)
        ? event.functionCallCount
        : Array.isArray(event.functionCalls) ? event.functionCalls.length : 0;
      const text = singleLine(event.outputText || "");
      const preview = text ? ` · text: ${truncate(text, 180)}` : "";
      return `⇠ model response · ${callCount} tool call(s)${preview}`;
    }
    case "first_tool_strategy": {
      const suggested = Array.isArray(event.suggestedFirstTools)
        ? event.suggestedFirstTools.join(", ") || "none"
        : event.suggestedTool || "none";
      const matched = event.matchedRecommendation ?? event.matched ?? false;
      return `◇ first tool strategy · chosen=${event.chosenTool || "none"} · suggested=${suggested} · matched=${Boolean(matched)}`;
    }
    case "first_tool_strategy_redirect": {
      const suggested = Array.isArray(event.suggestedFirstTools)
        ? event.suggestedFirstTools.join(", ") || "none"
        : event.suggestedTool || "none";
      return `↺ first tool redirected · chosen=${event.chosenTool || "none"} · suggested=${suggested}`;
    }
    case "tool_call_start":
      return `╭─ tool ${event.toolName || event.name || "unknown"} · risk=${event.riskLevel || "unknown"}\n│ args ${truncate(compactJson(event.arguments), 500)}`;
    case "tool_call_end": {
      const status = event.hadError || event.ok === false ? "error" : "ok";
      const output = singleLine(event.output || "");
      const preview = output ? `\n╰─ tool ${event.toolName || event.name || "unknown"} ${status} · output ${event.outputChars ?? output.length} chars · ${truncate(output, 300)}` : `\n╰─ tool ${event.toolName || event.name || "unknown"} ${status}`;
      return preview;
    }
    case "loop_end":
      return `✓ loop ended · ${event.toolSteps ?? 0} tool step(s)`;
    case "turn_error":
      return `✕ turn error · ${event.message || event.error || "unknown error"}`;
    case "turn_end":
      return `⎋ turn stored · ${event.turnId || ""}`;
    default:
      return null;
  }
}

function compactJson(value) {
  if (value === undefined || value === null || value === "") {
    return "{}";
  }
  if (typeof value === "string") {
    return singleLine(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}


function truncate(value, maxLength) {
  const text = String(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatError(error) {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Error: ${String(error)}`;
}

function isReadlineClosedError(error) {
  return error instanceof Error && error.message === "readline was closed";
}

function renderCliHelp({ interactive = false } = {}) {
  const prefix = interactive ? "/" : "code-agent ";
  const lines = [
    "Coding Agent CLI",
    "",
    "Core:",
    `- ${prefix}run <prompt>`,
    interactive ? null : "- code-agent run-events <prompt>" ,
    `- ${prefix}${interactive ? "status" : "status"}`,
    `- ${prefix}${interactive ? "next" : "next"}`,
    interactive ? "- /help" : "- code-agent help",
    "",
    "Strategy:",
    `- ${prefix}strategy show`,
    `- ${prefix}strategy set <balanced|conservative|autonomous>`,
    "",
    "Goals:",
    `- ${prefix}goal create <objective>`,
    `- ${prefix}goal show [id]`,
    `- ${prefix}goal list [limit]`,
    `- ${prefix}goal complete [id]`,
    `- ${prefix}goal cancel [id]`,
    `- ${prefix}goal resume <id>`,
    `- ${prefix}goal diagnose [id]`,
    "",
    "Session:",
    `- ${prefix}session show`,
    `- ${prefix}session history [limit]`,
    "",
    "Planning:",
    `- ${prefix}plan show`,
    `- ${prefix}plan summary`,
    `- ${prefix}plan execute`,
    `- ${prefix}plan export [title]`,
    `- ${prefix}plan set-status <index> <pending|in_progress|completed|blocked|skipped>`,
    `- ${prefix}plan retry <index>`,
    `- ${prefix}plan skip <index>`,
    `- ${prefix}plan reset-blocked`,
    `- ${prefix}plan-runs list`,
    `- ${prefix}plan-artifacts list`,
    "",
    "Subagents:",
    `- ${prefix}subagents list`,
    `- ${prefix}subagents summary [limit]`,
    `- ${prefix}subagents show <id>`,
    `- ${prefix}subagents set-status <id> <pending|accepted|rejected|needs_followup> [note]`,
    `- ${prefix}subagents run <objective> [context]`,
    `- ${prefix}subagents run-readonly <objective> [context]`,
    "",
    "Governance:",
    `- ${prefix}approvals list`,
    `- ${prefix}approvals show <id>`,
    `- ${prefix}approvals approve <id> [note]`,
    `- ${prefix}approvals reject <id> [note]`,
    `- ${prefix}approvals retry <id>`,
    "",
    "Inspect:",
    `- ${prefix}reviews run <plan|subagents|session|repo|code|strategy|approval>`,
    `- ${prefix}workflow list`,
    `- ${prefix}traces list [limit]`,
    `- ${prefix}dashboard show`,
    `- ${prefix}machine-state show`
  ];

  return lines.filter(Boolean).join("\n");
}

async function buildCliStatusSummary(runtime) {
  const [dashboard, skills, session] = await Promise.all([
    runtime.stateStore.getDashboardSummary(),
    runtime.skillDiscovery.listSkills(),
    runtime.stateStore.getSession()
  ]);

  return {
    projectRoot: runtime.config.projectRoot,
    transcriptTurnCount: session.transcriptTurnCount || 0,
    toolPolicy: {
      strategyMode: runtime.config.runtime.strategyMode || "balanced",
      maxToolRisk: runtime.config.runtime.maxToolRisk,
      subagentMaxToolRisk: runtime.config.runtime.subagentMaxToolRisk,
      requireConfirmationForWrite: runtime.config.runtime.requireConfirmationForWrite,
      requireConfirmationForRestricted: runtime.config.runtime.requireConfirmationForRestricted
    },
    activeGoal: dashboard.activeGoal,
    planItemCount: dashboard.planItemCount,
    completedPlanItemCount: dashboard.completedPlanItemCount,
    availableSkillCount: skills.length,
    reviewCount: dashboard.reviewCount,
    approvalRequestCount: dashboard.approvalRequestCount,
    openApprovalRequestCount: dashboard.openApprovalRequestCount,
    planArtifactCount: dashboard.planArtifactCount,
    reviewArtifactCount: dashboard.reviewArtifactCount,
    dashboardArtifactCount: dashboard.dashboardArtifactCount,
    bundleIndexArtifactCount: dashboard.bundleIndexArtifactCount,
    approvalArtifactCount: dashboard.approvalArtifactCount,
    workspaceSnapshotCount: dashboard.workspaceSnapshotCount,
    workflowRunCount: dashboard.workflowRunCount,
    workflowArtifactCount: dashboard.workflowArtifactCount,
    traceCount: dashboard.traceCount,
    traceArtifactCount: dashboard.traceArtifactCount,
    firstToolStrategySummary: dashboard.firstToolStrategySummary,
    governanceSummary: dashboard.governanceSummary,
    artifactCoverage: dashboard.artifactCoverage,
    autoRunDeliveryWorkflow: runtime.config.runtime.autoRunDeliveryWorkflow,
    enforceSuggestedFirstTool: runtime.config.runtime.enforceSuggestedFirstTool,
    latestWorkflowBundle: dashboard.latestWorkflowBundle,
    latestWorkflowStatusReasons: dashboard.latestWorkflowBundle?.statusReasons || [],
    recentPlanArtifacts: dashboard.recentPlanArtifacts,
    recentReviewArtifacts: dashboard.recentReviewArtifacts,
    recentApprovalRequests: dashboard.recentApprovalRequests,
    recentApprovalArtifacts: dashboard.recentApprovalArtifacts,
    recentDashboardArtifacts: dashboard.recentDashboardArtifacts,
    recentBundleIndexArtifacts: dashboard.recentBundleIndexArtifacts,
    recentWorkflowRuns: dashboard.recentWorkflowRuns,
    recentWorkflowArtifacts: dashboard.recentWorkflowArtifacts,
    recentReviewBundles: dashboard.recentReviewBundles,
    recentTraceBundles: dashboard.recentTraceBundles,
    recentTraceArtifacts: dashboard.recentTraceArtifacts,
    recentTraceKinds: dashboard.recentTraceKinds,
    suggestedNextReads: dashboard.suggestedNextReads,
    suggestedFirstTools: dashboard.suggestedFirstTools
  };
}

async function renderGoalDiagnosis(runtime, { goalId = "" } = {}) {
  let goal = goalId
    ? await runtime.stateStore.getGoal(goalId)
    : await runtime.stateStore.getActiveGoal();

  if (!goal && !goalId) {
    goal = (await runtime.stateStore.listGoals(1))[0] || null;
  }

  if (!goal) {
    return goalId ? `No such goal: ${goalId}` : "No active goal.";
  }

  const dashboard = await runtime.stateStore.getDashboardSummary();
  const governance = dashboard.governanceSummary || {};
  const isActiveGoal = dashboard.activeGoal?.id === goal.id;
  const blockerCode = isActiveGoal
    ? (governance.blockedGoalLastBlockerCode || goal.lastBlockerCode || null)
    : (goal.lastBlockerCode || null);
  const blockerMessage = isActiveGoal
    ? (governance.blockedGoalLastBlockerMessage || goal.lastBlockerMessage || null)
    : (goal.lastBlockerMessage || null);
  const recoverySuggestions = isActiveGoal
    ? (governance.recoverySuggestions || [])
    : (goal.status === "blocked" ? ["goal resume <id>", "machine-state show"] : []);

  const lines = [
    "**Goal Diagnosis**",
    `- Goal: ${goal.objective}`,
    `- Id: ${goal.id}`,
    `- Status: ${goal.status}`,
    `- Active in runtime: ${isActiveGoal ? "yes" : "no"}`,
    `- Goal turns: ${goal.turnCount ?? 0}`,
    `- Consecutive blocker count: ${goal.blockCount ?? 0}`,
    `- Latest blocker code: ${blockerCode || "(none)"}`,
    `- Latest blocker message: ${blockerMessage || "(none)"}`,
    `- Open approvals: ${governance.openApprovalCount ?? 0}`,
    `- Latest workflow status: ${governance.latestWorkflowStatus || "(none)"}`,
    `- Latest workflow reason codes: ${(governance.latestWorkflowReasonCodes || []).join(", ") || "(none)"}`,
    `- Recovery suggestions: ${recoverySuggestions.join(", ") || "(none)"}`,
    `- Suggested next reads: ${(dashboard.suggestedNextReadLabels || []).join(", ") || "(none)"}`
  ];

  if (isActiveGoal && (dashboard.recentApprovalRequests || []).length > 0) {
    lines.push(`- Recent approvals: ${(dashboard.recentApprovalRequests || []).map((item) => `${item.id}(${item.status})`).join(", ")}`);
  }

  return lines.filter(Boolean).join("\n");
}

async function renderNextActions(runtime) {
  const dashboard = await runtime.stateStore.getDashboardSummary();
  const lines = [
    "**Next Actions**",
    `- Active goal: ${dashboard.activeGoal?.objective || "(none)"}`,
    `- Plan progress: ${dashboard.completedPlanItemCount || 0}/${dashboard.planItemCount || 0}`,
    `- Suggested first tools: ${(dashboard.suggestedFirstTools || []).join(", ") || "(none)"}`,
    `- Suggested next reads: ${(dashboard.suggestedNextReadLabels || []).join(", ") || "(none)"}`
  ];
  for (const action of dashboard.recommendedActions || []) {
    lines.push(`- ${action.label}: ${action.detail || "(none)"}${action.command ? ` [${action.command}]` : ""}`);
  }

  return lines.filter(Boolean).join("\n");
}

function renderSessionHistory(transcriptTurns) {
  if (!transcriptTurns || transcriptTurns.length === 0) {
    return "No transcript messages recorded.";
  }

  return [
    "**Session History**",
    ...transcriptTurns.map((turn, index) => {
      return [
        `### Transcript Turn ${transcriptTurns.length - index}`,
        `- At: ${turn.createdAt}`,
        `- Messages: ${turn.messageCount || 0}`,
        `- Tool uses/results: ${turn.toolUseCount || 0}/${turn.toolResultCount || 0}`,
        `- Thinking blocks: ${turn.thinkingBlockCount || 0}`,
        `- User: ${singleLine(turn.userText) || "(empty)"}`,
        `- Assistant: ${singleLine(turn.assistantText) || "(empty)"}`
      ].join("\n");
    })
  ].join("\n\n");
}

function singleLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
