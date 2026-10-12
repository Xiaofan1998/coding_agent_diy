export class LocalFallbackAgent {
  constructor({ config, toolRegistry, stateStore, skillDiscovery, subagentManager, planArtifactManager, executeTool }) {
    this.config = config;
    this.toolRegistry = toolRegistry;
    this.stateStore = stateStore;
    this.skillDiscovery = skillDiscovery;
    this.subagentManager = subagentManager;
    this.planArtifactManager = planArtifactManager;
    this.executeTool = executeTool;
  }

  async run({ userMessage, goal, session, repoSnapshot, activatedSkills = [], isSubagent = false }) {
    const input = userMessage.trim();
    const lowered = input.toLowerCase();

    if (!input) {
      return { message: "Empty input." };
    }

    if (isSubagent) {
      return this.runSubagentFallback(input, repoSnapshot);
    }

    if (matchesAny(lowered, ["list files", "project structure", "项目结构", "列出文件", "目录"])) {
      const result = unwrapToolData(await this.executeTool("list_files", { path: ".", limit: 200 }));
      return {
        message: renderSection("Project Files", toBulletList(result.slice(0, 80)))
      };
    }

    if (matchesAny(lowered, ["skill", "skills"])) {
      const skills = await this.skillDiscovery.listSkills();
      return {
        message: renderSection(
          "Available Skills",
          toBulletList(skills.map((skill) => {
            const supportSummary = skill.supportSummary
              ? `refs=${skill.supportSummary.references}, scripts=${skill.supportSummary.scripts}, assets=${skill.supportSummary.assets}`
              : "refs=0, scripts=0, assets=0";
            return `${skill.name} [${skill.source}] (${supportSummary}): ${skill.description}`;
          }))
        )
      };
    }

    if (matchesAny(lowered, ["goal", "目标"])) {
      if (matchesAny(lowered, ["blocked", "diagnose", "why", "卡住", "阻塞"])) {
        return {
          message: renderSection("Goal Diagnosis", await formatGoalDiagnosis(this.stateStore, goal))
        };
      }
      return {
        message: goal
          ? renderSection("Active Goal", `- ${goal.objective}\n- status: ${goal.status}\n- turns: ${goal.turnCount}`)
          : "No active goal."
      };
    }

    if (matchesAny(lowered, ["status", "dashboard", "状态", "概览"])) {
      return {
        message: renderSection("Dashboard", formatDashboard(await this.stateStore.getDashboardSummary()))
      };
    }

    if (matchesAny(lowered, ["strategy", "mode", "策略", "自治模式"])) {
      if (matchesAny(lowered, ["conservative", "balanced", "autonomous", "保守", "平衡", "自治", "切换", "switch", "set"])) {
        const mode = detectStrategyMode(lowered);
        if (mode) {
          const result = await this.executeTool("set_strategy_mode", { mode });
          return {
            message: renderSection("Strategy Mode", `- strategyMode: ${result.strategyMode}\n- maxToolRisk: ${result.runtime.maxToolRisk}\n- autoRunDeliveryWorkflow: ${result.runtime.autoRunDeliveryWorkflow}`)
          };
        }
      }
      const result = await this.executeTool("get_runtime_settings", {});
      return {
        message: renderSection("Strategy Mode", `- strategyMode: ${result.strategyMode}\n- maxToolRisk: ${result.runtime.maxToolRisk}\n- autoRunDeliveryWorkflow: ${result.runtime.autoRunDeliveryWorkflow}\n- enforceSuggestedFirstTool: ${result.runtime.enforceSuggestedFirstTool}`)
      };
    }

    if (matchesAny(lowered, ["next", "what next", "下一步", "接下来"])) {
      const nextActions = await this.executeTool("get_next_actions", {});
      return {
        message: renderSection("Next Actions", formatNextActionsPayload(nextActions))
      };
    }

    if (matchesAny(lowered, ["session", "history", "会话", "历史"])) {
      const transcriptTurns = await this.stateStore.listTranscriptTurns(5, "desc");
      return {
        message: renderSection("Session History", formatSessionHistory(transcriptTurns))
      };
    }

    if (hasExplicitWebSearchIntent(input, lowered)) {
      const query = extractWebQuery(input);
      if (query) {
        const result = await this.executeTool("search_web", { query, limit: 5 });
        return {
          message: renderSection("Web Search", formatWebSearch(result))
        };
      }
    }

    const readPath = detectFilePath(input);
    if (readPath && matchesAny(lowered, ["read", "show", "查看", "读取", "打开"])) {
      const content = unwrapToolData(await this.executeTool("read_file", { path: readPath, startLine: 1, endLine: 200 }));
      return {
        message: `Read \`${readPath}\`.\n\n\`\`\`\n${content}\n\`\`\``
      };
    }

    if (hasCodeSummaryIntent(lowered)) {
      return {
        message: renderSection("Code Summary", formatCodeSummary(repoSnapshot, input))
      };
    }

    if (hasExplicitSearchIntent(input, lowered)) {
      const pattern = extractSearchPattern(input);
      if (pattern) {
        const result = unwrapToolData(await this.executeTool("search_files", { pattern, path: ".", maxResults: 50 }));
        return {
          message: renderSection("Search Results", result || "(no matches)")
        };
      }
    }

    if (matchesAny(lowered, ["execute plan", "run plan", "执行计划"])) {
      const result = await this.subagentManager.runPlan({
        planItems: await this.stateStore.getPlanItems(),
        mode: "sequential"
      });
      return {
        message: renderSection("Plan Execution", formatPlanRun(result))
      };
    }

    if (matchesAny(lowered, ["export plan", "save plan", "导出计划"])) {
      return {
        message: "Use `plan export [title]` to save the active plan into the configured artifact root."
      };
    }

    if (matchesAny(lowered, ["reset blocked plan", "retry blocked plan", "重试阻塞计划", "重置阻塞计划"])) {
      const result = unwrapToolData(await this.executeTool("reset_blocked_plan_items", {}));
      return {
        message: renderSection(
          "Plan Reset",
          toBulletList(result.map((item) => `[${item.status}] ${item.content}`))
        )
      };
    }

    if (matchesAny(lowered, ["skip plan item", "skip plan", "跳过计划项", "跳过计划"])) {
      return {
        message: "Use `plan skip <index>` to mark a plan item as skipped, or `plan retry <index>` to put one back into pending."
      };
    }

    if (matchesAny(lowered, ["plan", "规划", "计划"])) {
      return this.handlePlanRequest(input, goal, repoSnapshot, activatedSkills);
    }

    return {
      message: [
        ...(await renderHighLevelSummary(this.stateStore)),
        "",
        buildFallbackModeNotice(this.config),
        "",
        "It can still help with:",
        "- listing files and project structure",
        "- reading files",
        "- searching text",
        "- drafting and storing simple plans",
        "- executing saved plan items through subagents",
        "- reviewing plans, sessions, and subagent output through CLI commands",
        "- checking repository/code integration points through code-aware reviews",
        "- exporting review reports into the configured artifact root",
        "- running a delivery workflow that chains execution, artifacts, and reviews",
        "",
        `Transcript turns: ${session.transcriptTurnCount || 0}`,
        `Top-level files: ${repoSnapshot.files.join(", ") || "(none)"}`,
        `Git repo: ${repoSnapshot.isGitRepo ? "yes" : "no"}`,
        `Saved plan items: ${(await this.stateStore.getPlanItems()).length}`,
        `Saved reviews: ${(await this.stateStore.listReviews()).length}`,
        `Exported plan artifacts: ${(await this.stateStore.listPlanArtifacts()).length}`,
        `Exported review artifacts: ${(await this.stateStore.listReviewArtifacts()).length}`,
        `Workflow runs: ${(await this.stateStore.listWorkflowRuns()).length}`,
        `Workflow artifacts: ${(await this.stateStore.listWorkflowArtifacts()).length}`,
        `Trace artifacts: ${(await this.stateStore.listTraceArtifacts()).length}`
      ].join("\n")
    };
  }

  async handlePlanRequest(input, goal, repoSnapshot, activatedSkills) {
    const objective = goal?.objective || input;
    const suggestion = await this.planArtifactManager.createSuggestedPlan({
      objective,
      goal,
      repoSnapshot,
      skills: activatedSkills
    });
    return {
      message: [
        renderSection("Saved Plan", toBulletList(suggestion.planItems.map((item) => `[${item.status}] ${item.content}`))),
        "",
        renderSection(
          "Plan Context",
          [
            `- Suggested files: ${suggestion.suggestedFiles.join(", ") || "(none)"}`,
            `- Matched skills: ${suggestion.matchedSkills.join(", ") || "(none)"}`
          ].join("\n")
        )
      ].join("\n")
    };
  }

  async runSubagentFallback(input, repoSnapshot) {
    const objective = extractSubagentObjective(input);
    const lowered = objective.toLowerCase();

    if (lowered.includes("identify the files") || lowered.includes("modules")) {
      const files = unwrapToolData(await this.executeTool("list_files", { path: ".", limit: 80 }));
      return {
        message: [
          `Scoped subagent summary for: ${objective}`,
          "",
          "Likely files to inspect next:",
          ...files.slice(0, 20).map((file) => `- ${file}`)
        ].join("\n")
      };
    }

    if (lowered.includes("verification")) {
      try {
        const result = unwrapToolData(await this.executeTool("run_shell", {
          command: "if [ -f ./scripts/check.js ]; then node ./scripts/check.js; else echo 'No verification script found.'; fi"
        }));
        return {
          message: [
            `Scoped subagent summary for: ${objective}`,
            "",
            "Verification output:",
            result.stdout || "(no stdout)",
            result.stderr ? `stderr: ${result.stderr}` : ""
          ].filter(Boolean).join("\n")
        };
      } catch (error) {
        return {
          message: `Scoped subagent summary for: ${objective}\n\nVerification failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    if (lowered.includes("summarize outcomes") || lowered.includes("remaining risks")) {
      return {
        message: [
          `Scoped subagent summary for: ${objective}`,
          "",
          `Top-level files: ${repoSnapshot.files.join(", ") || "(none)"}`,
          "Remaining risk: local fallback mode can inspect and verify, but not reason as deeply as a model-backed subagent."
        ].join("\n")
      };
    }

    return {
      message: [
        `Scoped subagent summary for: ${objective}`,
        "",
        `Top-level files: ${repoSnapshot.files.join(", ") || "(none)"}`,
        "Local fallback subagent completed a lightweight inspection."
      ].join("\n")
    };
  }
}

function unwrapToolData(result) {
  if (result && typeof result === "object" && Object.hasOwn(result, "data") && Object.hasOwn(result, "status")) {
    return result.data;
  }
  return result;
}

function extractSearchPattern(input) {
  const quoted = input.match(/["']([^"']+)["']/);
  if (quoted) {
    return quoted[1];
  }

  const trimmed = input
    .replace(/search|find|grep|查找|搜索/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed || null;
}

function detectFilePath(input) {
  const match = input.match(/([A-Za-z0-9_./-]+\.[A-Za-z0-9_]+)/);
  return match ? match[1] : null;
}

function matchesAny(lowered, patterns) {
  return patterns.some((pattern) => lowered.includes(pattern));
}

function renderSection(title, body) {
  return `**${title}**\n${body}`;
}

function toBulletList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatPlanRun(result) {
  return [
    `Mode: ${result.mode}`,
    `Completed: ${result.completedCount}/${result.totalCount}`,
    ...result.results.map((entry) => `- ${entry.planItem.content}: ${entry.status}`)
  ].join("\n");
}

function hasExplicitSearchIntent(input, lowered) {
  if (/^\s*(search|find|grep)\b/i.test(input)) {
    return true;
  }

  return ["查找", "搜索"].some((keyword) => {
    return lowered.startsWith(keyword) || lowered.includes(`请${keyword}`) || lowered.includes(`帮我${keyword}`);
  });
}

function extractSubagentObjective(input) {
  const match = input.match(/Subagent objective:\s*([\s\S]*?)(?:\n\nRelevant context:|$)/);
  return match ? match[1].trim() : input.trim();
}

function hasExplicitWebSearchIntent(input, lowered) {
  if (/^\s*(web search|search web|internet search)\b/i.test(input)) {
    return true;
  }

  return ["网页检索", "搜索网页", "检索网页", "搜索网络", "网上搜索", "查一下网上", "联网搜索"].some((keyword) => lowered.includes(keyword));
}

function extractWebQuery(input) {
  const quoted = input.match(/["']([^"']+)["']/);
  if (quoted) {
    return quoted[1];
  }

  return input
    .replace(/web search|search web|internet search/gi, "")
    .replace(/网页检索|搜索网页|检索网页|搜索网络|网上搜索|查一下网上|联网搜索/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatWebSearch(result) {
  const lines = [`Provider: ${result.queryProvider || "(unknown)"}`];
  for (const item of result.results || []) {
    lines.push(`- ${item.title}`);
    lines.push(`  ${item.url}`);
    if (item.snippet) {
      lines.push(`  ${item.snippet}`);
    }
  }
  return lines.join("\n");
}

function hasCodeSummaryIntent(lowered) {
  if ((lowered.includes("梳理") || lowered.includes("总结") || lowered.includes("说明")) && (lowered.includes("代码") || lowered.includes(".js") || lowered.includes(".ts") || lowered.includes(".md"))) {
    return true;
  }

  return [
    "梳理代码",
    "代码梳理",
    "梳理当前代码",
    "总结代码",
    "explain the code",
    "summarize the code",
    "summarise the code",
    "code summary",
    "architecture",
    "代码架构"
  ].some((keyword) => lowered.includes(keyword));
}

function formatCodeSummary(repoSnapshot, input) {
  const requestedPath = detectFilePath(input);
  const lines = [
    `Workspace roots: ${(repoSnapshot.workspaceRoots || [repoSnapshot.projectRoot]).join(", ")}`,
    `Top-level files: ${(repoSnapshot.files || []).join(", ") || "(none)"}`,
    `Sample source files: ${(repoSnapshot.sourceFiles || []).slice(0, 30).join(", ") || "(none)"}`,
    "Repository source snippets are not preloaded. Use search/read tools for exact code content."
  ];

  if (requestedPath) {
    lines.push(`Requested path hint: ${requestedPath}`);
  }

  return lines.join("\n");
}

async function renderHighLevelSummary(stateStore) {
  const dashboard = await stateStore.getDashboardSummary();
  const bundleIndex = await stateStore.getBundleIndexSummary();
  const latestWorkflow = dashboard.latestWorkflowBundle;
  if (!latestWorkflow) {
    return ["No workflow bundles recorded yet."];
  }

  const latestReasonCodes = latestWorkflow.statusReasonCodes || [];
  const governanceSummary = dashboard.governanceSummary || null;
  const pendingApprovalHint = latestReasonCodes.includes("approval_pending")
    ? [
        `Pending approval focus: ${(dashboard.recentApprovalRequests || []).map((item) => item.id).join(", ") || "(none)"}`,
        `Suggested approval reads: ${(dashboard.suggestedNextReads || []).filter((item) => item.kind === "approvalArtifact" || item.kind === "approvalRequest").map((item) => `${item.kind}:${item.id}`).join(", ") || "(none)"}`
      ]
    : [];

  return [
    `Latest workflow: ${latestWorkflow.id} (${latestWorkflow.status})`,
    `Latest workflow reason codes: ${latestReasonCodes.join(", ") || "(none)"}`,
    `Governance summary: ${formatGovernanceSummary(governanceSummary)}`,
    `Current plan linkage: ${dashboard.linkedSubagentCount || 0} linked subagent result(s), ${dashboard.pendingSubagentReviewCount || 0} pending subagent review(s)`,
    `Latest workflow reviews: ${latestWorkflow.reviewCount}`,
    `Latest workflow traces: ${latestWorkflow.traceCount}`,
    `Recent workflow bundles: ${(bundleIndex.workflowBundles || []).map((item) => item.id).join(", ") || "(none)"}`,
    `Recent review bundles: ${(bundleIndex.reviewBundles || []).map((item) => item.id).join(", ") || "(none)"}`,
    `Recent trace bundles: ${(bundleIndex.traceBundles || []).map((item) => item.id).join(", ") || "(none)"}`,
    ...pendingApprovalHint,
    `Recent plan artifacts: ${(dashboard.recentPlanArtifacts || []).map((item) => item.path).join(", ") || "(none)"}`,
    `Recent dashboard artifacts: ${(dashboard.recentDashboardArtifacts || []).map((item) => item.path).join(", ") || "(none)"}`,
    `Recent bundle-index artifacts: ${(dashboard.recentBundleIndexArtifacts || []).map((item) => item.path).join(", ") || "(none)"}`,
    `Recent workflow artifacts: ${(dashboard.recentWorkflowArtifacts || []).map((item) => item.path).join(", ") || "(none)"}`,
    `Recent trace kinds: ${(dashboard.recentTraceKinds || []).join(", ") || "(none)"}`,
    `Suggested next reads: ${(dashboard.suggestedNextReadLabels || []).join(", ") || "(none)"}`,
    `First-tool strategy: ${dashboard.firstToolStrategySummary ? `${dashboard.firstToolStrategySummary.matched}/${dashboard.firstToolStrategySummary.total} matched` : "(none)"}`,
    `Missing artifacts: ${(dashboard.artifactCoverage?.missing || []).join(", ") || "(none)"}`
  ];
}

function formatDashboard(dashboard) {
  const latestReasonCodes = dashboard.latestWorkflowBundle?.statusReasonCodes || [];
  return [
    `- Active goal: ${dashboard.activeGoal?.objective || "(none)"}`,
    `- Plan progress: ${dashboard.completedPlanItemCount || 0}/${dashboard.planItemCount || 0}`,
    `- Reviews: ${dashboard.reviewCount || 0}`,
    `- Open approvals: ${dashboard.openApprovalRequestCount || 0}`,
    `- Workflows: ${dashboard.workflowRunCount || 0}`,
    `- Workflow artifacts: ${dashboard.workflowArtifactCount || 0}`,
    `- Traces: ${dashboard.traceCount || 0}`,
    `- Trace artifacts: ${dashboard.traceArtifactCount || 0}`,
    `- Linked subagents: ${dashboard.linkedSubagentCount || 0}`,
    `- Pending subagent reviews: ${dashboard.pendingSubagentReviewCount || 0}`,
    `- Latest workflow: ${dashboard.latestWorkflowBundle ? `${dashboard.latestWorkflowBundle.id} (${dashboard.latestWorkflowBundle.status})` : "(none)"}`,
    `- Latest workflow reason codes: ${latestReasonCodes.join(", ") || "(none)"}`,
    `- Governance summary: ${formatGovernanceSummary(dashboard.governanceSummary)}`,
    `- Suggested first tools: ${(dashboard.suggestedFirstTools || []).join(", ") || "(none)"}`,
    `- Recent plan artifacts: ${(dashboard.recentPlanArtifacts || []).map((item) => item.path).join(", ") || "(none)"}`,
    `- Recent workflow artifacts: ${(dashboard.recentWorkflowArtifacts || []).map((item) => item.path).join(", ") || "(none)"}`,
    `- Recent approval summaries: ${(dashboard.recentApprovalRequests || []).map((item) => item.changeSummary || item.title).join(" | ") || "(none)"}`
  ].join("\n");
}

function formatGovernanceSummary(summary) {
  if (!summary) {
    return "(none)";
  }
  return [
    `openApprovals=${summary.openApprovalCount ?? 0}`,
    `hold=${summary.governanceHoldActive ? "yes" : "no"}`,
    `approvalPending=${summary.approvalPendingActive ? "yes" : "no"}`,
    `goalBlocked=${summary.goalBlockedActive ? "yes" : "no"}`,
    `reasonCodes=${(summary.latestWorkflowReasonCodes || []).join(",") || "(none)"}`
  ].join(" ");
}

function formatSessionHistory(transcriptTurns) {
  if (!transcriptTurns || transcriptTurns.length === 0) {
    return "(none)";
  }

  return transcriptTurns.map((turn) => {
    return [
      `- ${turn.createdAt} [messages=${turn.messageCount || 0}, tools=${turn.toolUseCount || 0}/${turn.toolResultCount || 0}, thinking=${turn.thinkingBlockCount || 0}]`,
      `  user: ${clipLine(turn.userText)}`,
      `  assistant: ${clipLine(turn.assistantText)}`
    ].join("\n");
  }).join("\n");
}

function clipLine(value, maxChars = 140) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized || "(empty)";
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}

function buildFallbackModeNotice(config) {
  if (!config?.openai?.apiKey) {
    return "API_KEY is not set, so the agent is using local fallback mode.";
  }
  return "Model-backed execution is currently unavailable, so the agent is using local fallback mode.";
}

function detectStrategyMode(lowered) {
  if (lowered.includes("conservative") || lowered.includes("保守")) {
    return "conservative";
  }
  if (lowered.includes("autonomous") || lowered.includes("自治")) {
    return "autonomous";
  }
  if (lowered.includes("balanced") || lowered.includes("平衡")) {
    return "balanced";
  }
  return null;
}

async function formatGoalDiagnosis(stateStore, goal) {
  if (!goal) {
    return "No active goal.";
  }

  const dashboard = await stateStore.getDashboardSummary();
  const governance = dashboard.governanceSummary || {};
  return [
    `- Goal: ${goal.objective}`,
    `- Status: ${goal.status}`,
    `- Turn count: ${goal.turnCount ?? 0}`,
    `- Consecutive blocker count: ${goal.blockCount ?? 0}`,
    `- Blocker code: ${governance.blockedGoalLastBlockerCode || goal.lastBlockerCode || "(none)"}`,
    `- Blocker message: ${governance.blockedGoalLastBlockerMessage || goal.lastBlockerMessage || "(none)"}`,
    `- Recovery suggestions: ${(governance.recoverySuggestions || []).join(", ") || "(none)"}`,
    `- Suggested next reads: ${(dashboard.suggestedNextReadLabels || []).join(", ") || "(none)"}`
  ].join("\n");
}

function formatNextActionsPayload(nextActions) {
  const lines = [
    `- Active goal: ${nextActions.activeGoal?.objective || "(none)"}`,
    `- Plan progress: ${nextActions.planProgress?.completed || 0}/${nextActions.planProgress?.total || 0}`,
    `- Suggested first tools: ${(nextActions.suggestedFirstTools || []).join(", ") || "(none)"}`,
    `- Suggested next reads: ${(nextActions.suggestedNextReadLabels || []).join(", ") || "(none)"}`
  ];
  for (const action of nextActions.recommendedActions || []) {
    lines.push(`- ${action.label}: ${action.detail || "(none)"}${action.command ? ` [${action.command}]` : ""}`);
  }

  return lines.join("\n");
}
