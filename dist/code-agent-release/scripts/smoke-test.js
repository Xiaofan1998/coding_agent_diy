import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import { resolveArtifactRecordPath } from "../packages/shared/artifact-paths.js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const nodeBin = process.execPath;
const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "code-agent-smoke-"));
const userSkillDir = path.join(stateDir, "user-skills");
const workspaceRootsEnv = [root, path.resolve(root, "..", "geometry_videogen")].join(path.delimiter);
const peerWorkspaceDir = path.resolve(root, "..", "peer-workspace-smoke");
const peerWorkspaceEnv = [root, peerWorkspaceDir].join(path.delimiter);

await fs.mkdir(peerWorkspaceDir, { recursive: true });
await fs.mkdir(path.join(peerWorkspaceDir, ".agents", "skills", "peer-skill"), { recursive: true });
await fs.writeFile(
  path.join(peerWorkspaceDir, "peer-module.js"),
  [
    "export function peerValue() {",
    "  return 42;",
    "}",
    "",
    "export const peerLabel = 'peer-workspace';"
  ].join("\n"),
  "utf8"
);
await fs.writeFile(
  path.join(peerWorkspaceDir, ".agents", "skills", "peer-skill", "SKILL.md"),
  [
    "---",
    "name: peer-skill",
    "description: Skill loaded from a secondary workspace root.",
    "---",
    "",
    "# Peer Skill",
    "",
    "Use this skill when verifying cross-workspace skill discovery."
  ].join("\n"),
  "utf8"
);

await fs.mkdir(path.join(userSkillDir, "global-smoke-skill", "references"), { recursive: true });
await fs.writeFile(
  path.join(userSkillDir, "global-smoke-skill", "SKILL.md"),
  [
    "---",
    "name: global-smoke-skill",
    "description: Verify user-global skills are discovered and can reference support files.",
    "tags: smoke,global,skill",
    "---",
    "",
    "# Global Smoke Skill",
    "",
    "Read `references/checklist.md` before using this skill."
  ].join("\n"),
  "utf8"
);
await fs.writeFile(
  path.join(userSkillDir, "global-smoke-skill", "references", "checklist.md"),
  "# Checklist\n\n- Confirm the user-global skill directory is loaded.\n",
  "utf8"
);

const env = {
  ...process.env,
  CODE_AGENT_HOME: stateDir,
  CODE_AGENT_SESSION_ID: "smoke-session",
  CODE_AGENT_USER_SKILL_DIR: userSkillDir,
  CODE_AGENT_WORKSPACE_ROOTS: workspaceRootsEnv,
  CODE_AGENT_DISABLE_DOTENV: "1",
  CODE_AGENT_DISABLE_DEFAULT_API_KEY: "1",
  OPENAI_MODEL: "",
  API_HOST: "",
  API_KEY: "",
};

const generatedSessionA = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    "import { loadConfig } from './packages/shared/config.js'; console.log(loadConfig(process.cwd()).sessionId);"
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "generated-session-a"),
    CODE_AGENT_SESSION_ID: ""
  }
).stdout.trim();
const generatedSessionB = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    "import { loadConfig } from './packages/shared/config.js'; console.log(loadConfig(process.cwd()).sessionId);"
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "generated-session-b"),
    CODE_AGENT_SESSION_ID: ""
  }
).stdout.trim();
if (generatedSessionA === generatedSessionB || !generatedSessionA.startsWith("session_") || !generatedSessionB.startsWith("session_")) {
  throw new Error("Expected default session ids to be startup-scoped and unique across processes.");
}
const explicitSession = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    "import { loadConfig } from './packages/shared/config.js'; console.log(loadConfig(process.cwd()).sessionId);"
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "explicit-session"),
    CODE_AGENT_SESSION_ID: "explicit-smoke-session"
  }
).stdout.trim();
if (explicitSession !== "explicit-smoke-session") {
  throw new Error("Expected CODE_AGENT_SESSION_ID to override startup-generated session ids.");
}


const fileBackedMemory = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import fs from 'node:fs/promises';",
      "import path from 'node:path';",
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const saved = await runtime.stateStore.saveMemory({ scope: 'project', content: 'Prefer Markdown memory files for durable project facts.', tags: ['memory', 'markdown'] });",
      "const found = await runtime.stateStore.searchMemories('Markdown memory');",
      "const index = await fs.readFile(path.join(config.memoryDir, 'MEMORY.md'), 'utf8');",
      "const relevant = await runtime.stateStore.findRelevantMemories('Markdown memory', { limit: 3 });",
      "const expectedProjectMemoryDir = process.cwd().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'project';",
      "console.log(JSON.stringify({ savedRelativePath: saved.relativePath, foundCount: found.length, indexIncludes: index.includes('Prefer Markdown memory files'), relevantCount: relevant.length, singleMemoryFile: saved.relativePath === 'MEMORY.md', projectScopedDir: path.basename(config.memoryDir) === expectedProjectMemoryDir }));"
    ].join(" ")
  ],
  { CODE_AGENT_HOME: path.join(stateDir, "file-memory-store") }
);
assertIncludes(fileBackedMemory.stdout, "\"foundCount\":1", "Expected file-backed memory search to find the saved Markdown memory.");
assertIncludes(fileBackedMemory.stdout, "\"indexIncludes\":true", "Expected MEMORY.md to contain the saved memory entry.");
assertIncludes(fileBackedMemory.stdout, "\"singleMemoryFile\":true", "Expected file-backed memory saves to use the project MEMORY.md file.");
assertIncludes(fileBackedMemory.stdout, "\"relevantCount\":1", "Expected query-time memory relevance to find the saved Markdown memory.");
assertIncludes(fileBackedMemory.stdout, "\"projectScopedDir\":true", "Expected file-backed memory to be isolated by escaped project path.");


const contextCompact = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { compactContext, microcompactMessages } from './packages/core/context-compactor.js';",
      "const traces = [];",
      "const transcriptMessages = Array.from({ length: 14 }, (_, index) => ({ id: index + 1, role: index % 2 ? 'assistant' : 'user', content: `message-${index} ${'x'.repeat(800)}` }));",
      "const config = { runtime: { autoCompactEnabled: true, maxContextChars: 3000, contextCompactThresholdRatio: 0.9, contextCompactKeepRecentMessages: 4, maxCompactedContextChars: 1200, maxCompactedMessageChars: 500 }, openai: { model: 'gpt-5.5', maxTokens: 800000, maxCompletionTokens: 32000 } };",
      "const result = await compactContext({ systemPrompt: 'system', transcriptMessages, runtimeContextMessages: [], userTurnMessage: { role: 'user', content: 'next' }, config, createTrace: async (payload) => traces.push(payload) });",
      "const micro = microcompactMessages([{ role: 'assistant', content: [{ type: 'tool_use', id: 'x', name: 'read_file', input: {} }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'y'.repeat(1000) }] }], { config, maxMessageChars: 100 });",
      "console.log(JSON.stringify({ compacted: result.compacted, source: result.source, includesBoundary: result.conversation[1].content.includes('<compact-summary>'), recentKept: result.conversation.at(-2).content.includes('message-13'), traceKind: traces[0]?.kind, microCleared: JSON.stringify(micro.messages).includes('Old tool result content cleared') }));"
    ].join(" ")
  ],
  { CODE_AGENT_HOME: path.join(stateDir, "context-compact") }
);
assertIncludes(contextCompact.stdout, "\"compacted\":true", "Expected context compact to trigger over the threshold.");
assertIncludes(contextCompact.stdout, "\"source\":\"traditional\"", "Expected traditional compact when no session memory is available.");
assertIncludes(contextCompact.stdout, "\"includesBoundary\":true", "Expected compact to insert a boundary summary message.");
assertIncludes(contextCompact.stdout, "\"recentKept\":true", "Expected compact to preserve recent conversation tail.");
assertIncludes(contextCompact.stdout, "\"traceKind\":\"context_compact\"", "Expected context compact to emit a trace event.");
assertIncludes(contextCompact.stdout, "\"microCleared\":true", "Expected microcompact to clear large tool_result content without owning whole-history summary.");


const compactPromptFormatting = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { buildCompactSummaryPrompt, formatCompactSummary } from './packages/core/compact-prompt.js';",
      "const prompt = buildCompactSummaryPrompt();",
      "const formatted = formatCompactSummary('<analysis>scratch</analysis>\\n<summary>usable summary</summary>');",
      "console.log(JSON.stringify({ hasAnalysisInstruction: prompt.includes('<analysis>'), hasSummaryInstruction: prompt.includes('<summary>'), formatted, stripsAnalysis: !formatted.includes('scratch') }));"
    ].join(" ")
  ],
  { CODE_AGENT_HOME: path.join(stateDir, "compact-prompt-formatting") }
);
assertIncludes(compactPromptFormatting.stdout, "\"hasAnalysisInstruction\":true", "Expected compact prompt to request an analysis drafting block.");
assertIncludes(compactPromptFormatting.stdout, "\"hasSummaryInstruction\":true", "Expected compact prompt to request a summary block.");
assertIncludes(compactPromptFormatting.stdout, "\"formatted\":\"usable summary\"", "Expected compact formatter to keep only the summary body.");
assertIncludes(compactPromptFormatting.stdout, "\"stripsAnalysis\":true", "Expected compact formatter to strip analysis scratchpad text.");

const cliHelp = run(["./apps/cli/index.js", "help"]);
assertIncludes(cliHelp.stdout, "goal resume <id>", "Expected CLI help to expose goal resume.");
assertIncludes(cliHelp.stdout, "run-events <prompt>", "Expected CLI help to expose JSONL event streaming runs.");
assertIncludes(cliHelp.stdout, "approvals retry <id>", "Expected CLI help to expose approval retry.");
assertIncludes(cliHelp.stdout, "session history [limit]", "Expected CLI help to expose session history.");
assertIncludes(cliHelp.stdout, "plan reset-blocked", "Expected CLI help to expose blocked-plan reset.");
assertIncludes(cliHelp.stdout, "subagents run-readonly <objective> [context]", "Expected CLI help to expose explicit readonly subagent runs.");
assertIncludes(cliHelp.stdout, "plan retry <index>", "Expected CLI help to expose plan retry.");
assertIncludes(cliHelp.stdout, "plan skip <index>", "Expected CLI help to expose plan skip.");
assertIncludes(cliHelp.stdout, "subagents summary [limit]", "Expected CLI help to expose subagent summary.");
assertIncludes(cliHelp.stdout, "subagents set-status <id> <pending|accepted|rejected|needs_followup> [note]", "Expected CLI help to expose subagent adoption status control.");
assertIncludes(cliHelp.stdout, "code-agent next", "Expected CLI help to expose the next-action command.");
assertIncludes(cliHelp.stdout, "strategy set <balanced|conservative|autonomous>", "Expected CLI help to expose strategy mode switching.");

const externalCwd = await fs.mkdtemp(path.join(stateDir, "external-cwd-"));
const externalCwdRun = spawnSync(nodeBin, [path.join(root, "apps/cli/index.js"), "run", "status"], {
  cwd: externalCwd,
  env: {
    ...env,
    CODE_AGENT_HOME: path.join(stateDir, "external-cwd-state"),
    CODE_AGENT_MOCK_MODEL: "1"
  },
  encoding: "utf8"
});
if (externalCwdRun.status !== 0) {
  process.stdout.write(externalCwdRun.stdout || "");
  process.stderr.write(externalCwdRun.stderr || "");
  throw new Error("Expected CLI to run from an external cwd using agent-owned prompts.");
}
assertIncludes(externalCwdRun.stdout, "━━ Agent turn", "Expected external cwd CLI run to start an agent turn.");
assertNotIncludes(externalCwdRun.stdout, "prompts/base.md", "Expected external cwd CLI run not to look for prompts inside the user project root.");
assertNotIncludes(externalCwdRun.stdout, "unknown error", "Expected external cwd CLI run not to hide setup failures as unknown errors.");

const runtimeEventStream = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const types = [];",
      "for await (const event of runtime.runUserTurnEvents('status')) { types.push(event.type); }",
      "console.log(JSON.stringify({ types, hasTurnStart: types.includes('turn_start'), hasLoopStart: types.includes('loop_start'), hasToolStart: types.includes('tool_call_start'), hasToolEnd: types.includes('tool_call_end'), hasResult: types.includes('turn_result') }));"
    ].join(" ")
  ],
  { CODE_AGENT_HOME: path.join(stateDir, "runtime-event-stream"), CODE_AGENT_MOCK_MODEL: "1" }
);
assertIncludes(runtimeEventStream.stdout, "\"hasTurnStart\":true", "Expected runtime event stream to expose turn_start.");
assertIncludes(runtimeEventStream.stdout, "\"hasLoopStart\":true", "Expected runtime event stream to expose loop_start.");
assertIncludes(runtimeEventStream.stdout, "\"hasToolStart\":true", "Expected runtime event stream to expose tool_call_start.");
assertIncludes(runtimeEventStream.stdout, "\"hasToolEnd\":true", "Expected runtime event stream to expose tool_call_end.");
assertIncludes(runtimeEventStream.stdout, "\"hasResult\":true", "Expected runtime event stream to expose final turn_result.");


const concurrentToolExecution = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { runAgentLoop } from './packages/core/agent-loop.js';",
      "import { ToolRegistry, wrapSuccess } from './packages/tools/registry.js';",
      "const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
      "const events = [];",
      "const started = {};",
      "const ended = {};",
      "const tools = new ToolRegistry([",
      "  { name: 'safe_a', description: 'safe a', riskLevel: 'safe', readOnlyHint: true, concurrencySafeHint: true, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: async () => wrapSuccess('a') },",
      "  { name: 'safe_b', description: 'safe b', riskLevel: 'safe', readOnlyHint: true, concurrencySafeHint: true, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: async () => wrapSuccess('b') },",
      "  { name: 'unsafe_c', description: 'unsafe c', riskLevel: 'caution', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: async () => wrapSuccess('c') }",
      "]);",
      "let calls = 0;",
      "const modelClient = { async createResponse() { calls += 1; return calls === 1 ? { id: 'r1', outputText: '', thinkingBlocks: [], meta: { provider: 'test' }, functionCalls: [",
      "  { id: 'a', callId: 'a', name: 'safe_a', arguments: {} },",
      "  { id: 'b', callId: 'b', name: 'safe_b', arguments: {} },",
      "  { id: 'c', callId: 'c', name: 'unsafe_c', arguments: {} }",
      "] } : { id: 'r2', outputText: 'done', thinkingBlocks: [], meta: { provider: 'test' }, functionCalls: [] }; } };",
      "const result = await runAgentLoop({",
      "  modelClient, systemPrompt: 'system', conversation: [{ role: 'user', content: 'go' }], toolRegistry: tools,",
      "  config: { runtime: { maxToolOutputChars: 12000, maxRepeatedToolCallStreak: 10 }, openai: { model: 'test' } },",
      "  suggestedFirstTools: [], createTrace: async (event) => events.push({ trace: event }), onEvent: async (event) => events.push(event),",
      "  executeTool: async (name, args) => { started[name] = Date.now(); await sleep(name === 'unsafe_c' ? 20 : 80); ended[name] = Date.now(); return tools.get(name).execute(args); }",
      "});",
      "const batchStarts = events.filter((event) => event.type === 'tool_batch_start');",
      "const transcriptToolUses = result.conversation.flatMap((message) => Array.isArray(message.content) ? message.content.filter((block) => block.type === 'tool_use').map((block) => block.name) : []);",
      "console.log(JSON.stringify({ final: result.finalMessage, batchStarts: batchStarts.map((event) => ({ mode: event.mode, count: event.count, toolNames: event.toolNames })), safeOverlap: started.safe_b < ended.safe_a, unsafeAfterSafe: started.unsafe_c >= Math.max(ended.safe_a, ended.safe_b), transcriptToolUses }));"
    ].join(" ")
  ],
  { CODE_AGENT_HOME: path.join(stateDir, "concurrent-tool-execution") }
);
assertIncludes(concurrentToolExecution.stdout, '"mode":"parallel"', "Expected consecutive concurrency-safe tools to run as a parallel batch.");
assertIncludes(concurrentToolExecution.stdout, '"mode":"serial"', "Expected unsafe tools to run as a serial batch.");
assertIncludes(concurrentToolExecution.stdout, '"safeOverlap":true', "Expected concurrency-safe tools to overlap in execution.");
assertIncludes(concurrentToolExecution.stdout, '"unsafeAfterSafe":true', "Expected unsafe tool execution to wait for prior safe batch.");
assertIncludes(concurrentToolExecution.stdout, '"transcriptToolUses":["safe_a","safe_b","unsafe_c"]', "Expected transcript tool_use order to remain stable after parallel execution.");

const cliRenderedEventStream = runWithEnv(
  ["./apps/cli/index.js", "run", "status"],
  { CODE_AGENT_HOME: path.join(stateDir, "cli-rendered-event-stream"), CODE_AGENT_MOCK_MODEL: "1" }
);
assertIncludes(cliRenderedEventStream.stdout, "━━ Agent turn", "Expected CLI run to render the event stream boundary.");
assertIncludes(cliRenderedEventStream.stdout, "⇢ model request", "Expected CLI run to render model request progress.");
assertIncludes(cliRenderedEventStream.stdout, "╭─ tool", "Expected CLI run to render tool call topology.");
assertIncludes(cliRenderedEventStream.stdout, "━━ Final answer", "Expected CLI run to visually separate the final answer.");
const transcriptPersistence = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "await runtime.runUserTurn('transcript tool call smoke');",
      "const messages = await runtime.stateStore.listTranscriptMessages(20, 'asc');",
      "console.log(JSON.stringify(messages.map((m) => m.messageKind)));"
    ].join(" ")
  ],
  { CODE_AGENT_HOME: path.join(stateDir, "transcript-persistence"), CODE_AGENT_MOCK_MODEL: "1" }
);
assertIncludes(transcriptPersistence.stdout, "\"tool_use\"", "Expected transcript persistence to store assistant tool_use messages.");
assertIncludes(transcriptPersistence.stdout, "\"tool_result\"", "Expected transcript persistence to store user tool_result messages.");
const toolAwareMicrocompact = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { sanitizeTranscriptMessages } from './packages/core/transcript-utils.js';",
      "import { microcompactContext } from './packages/core/context-compactor.js';",
      "const conversation = [",
      "  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'missing', content: 'orphan' }] },",
      "  { role: 'assistant', content: [{ type: 'tool_use', id: 'a', name: 'run_shell', input: { command: 'echo hi' } }] },",
      "  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a', content: 'hi' }] },",
      "  { role: 'assistant', content: 'done' },",
      "  { role: 'assistant', content: [{ type: 'tool_use', id: 'b', name: 'read_file', input: { path: 'x' } }] },",
      "  { role: 'assistant', content: [{ type: 'thinking_summary', text: 'orphan thought' }] }",
      "];",
      "const sanitized = sanitizeTranscriptMessages(conversation);",
      "const compact = microcompactContext({ systemPrompt: 'x', conversation, config: { openai: { model: '1k' }, runtime: { maxContextChars: 120, contextCompactThresholdRatio: 0.5, contextCompactKeepRecentMessages: 1, maxCompactedContextChars: 2000, maxCompactedMessageChars: 500 } } });",
      "console.log(JSON.stringify({ sanitized, compact: compact.conversation }));"
    ].join(" ")
  ],
  { CODE_AGENT_HOME: path.join(stateDir, "tool-aware-microcompact") }
);
assertIncludes(toolAwareMicrocompact.stdout, "\"tool_use_id\":\"a\"", "Expected tool-aware microcompact to preserve matched tool_result ids.");
assertNotIncludes(toolAwareMicrocompact.stdout, "\"tool_use_id\":\"missing\"", "Expected orphan tool_result to be removed before compacting.");
assertNotIncludes(toolAwareMicrocompact.stdout, "\"id\":\"b\"", "Expected unresolved tool_use to be removed before compacting.");
assertNotIncludes(toolAwareMicrocompact.stdout, "orphan thought", "Expected thinking-only orphan messages to be removed before compacting.");
const blockedGoalAudit = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "await runtime.stateStore.createGoal('blocked audit goal');",
      "const now = new Date().toISOString();",
      "await runtime.stateStore.saveApprovalRequest({",
      "  id: 'approval_blocked_audit',",
      "  createdAt: now,",
      "  updatedAt: now,",
      "  status: 'pending',",
      "  kind: 'tool_policy_gate',",
      "  title: 'blocked audit approval',",
      "  summary: 'pending approval blocks the goal',",
      "  toolName: 'run_shell',",
      "  arguments: { command: 'echo hold' }",
      "});",
      "await runtime.runUserTurn('first blocked turn');",
      "await runtime.runUserTurn('second blocked turn');",
      "const third = await runtime.runUserTurn('third blocked turn');",
      "const goals = await runtime.stateStore.listGoals(5);",
      "console.log(JSON.stringify({ third, goals }));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, 'goal-blocked-audit'),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir,
    CODE_AGENT_WORKSPACE_ROOTS: workspaceRootsEnv,
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(blockedGoalAudit.stdout, "Goal governance update:", "Expected repeated blockers to append a governance update to the user-visible response.");
assertIncludes(blockedGoalAudit.stdout, "\"status\":\"blocked\"", "Expected repeated blockers to mark the goal as blocked.");
assertIncludes(blockedGoalAudit.stdout, "\"lastBlockerCode\":\"approval_pending\"", "Expected blocked-goal audit to persist the repeated blocker code.");
assertIncludes(blockedGoalAudit.stdout, "\"blockCount\":3", "Expected repeated blockers to increment the blocked-goal counter.");
const blockedGoalDiagnose = runWithEnv(
  ["./apps/cli/index.js", "goal", "diagnose"],
  {
    CODE_AGENT_HOME: path.join(stateDir, "goal-blocked-audit"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir,
    CODE_AGENT_WORKSPACE_ROOTS: workspaceRootsEnv,
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(blockedGoalDiagnose.stdout, "Goal Diagnosis", "Expected goal diagnose to render a human-readable diagnosis header.");
assertIncludes(blockedGoalDiagnose.stdout, "Recovery suggestions:", "Expected goal diagnose to include recovery guidance.");
const skillsList = run(["./apps/cli/index.js", "skills", "list"]);
assertIncludes(skillsList.stdout, "global-smoke-skill", "Expected user-global skill to be listed.");
run(["./apps/cli/index.js", "plan", "show"]);
run(["./apps/cli/index.js", "goal", "create", "smoke test goal"]);
const activeGoal = JSON.parse(run(["./apps/cli/index.js", "goal", "show"]).stdout);
const initialGoalId = activeGoal.id;
const goalList = run(["./apps/cli/index.js", "goal", "list", "5"]);
assertIncludes(goalList.stdout, initialGoalId, "Expected goal list to include the newly created active goal.");
run(["./apps/cli/index.js", "run", "请帮我规划一个实现任务"]);
const nextActions = run(["./apps/cli/index.js", "next"]);
assertIncludes(nextActions.stdout, "Next Actions", "Expected the next-action command to render a recommendation header.");
assertIncludes(nextActions.stdout, "Suggested first tools:", "Expected the next-action command to surface tool recommendations.");
assertIncludes(nextActions.stdout, "- ", "Expected the next-action command to render actionable recommendation lines.");
const nextActionsTool = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.executeTool('get_next_actions', {});",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: stateDir,
    CODE_AGENT_USER_SKILL_DIR: userSkillDir
  }
);
assertIncludes(nextActionsTool.stdout, "\"recommendedActions\"", "Expected the next-actions tool to expose structured recommended actions.");
const multiWorkspaceRepoContext = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { buildRepoSnapshot } from './packages/context/repo-context.js';",
      "const config = loadConfig(process.cwd());",
      "const snapshot = await buildRepoSnapshot(config, { query: '请梳理 peer-module.js 的实现', activatedSkills: [] });",
      "console.log(JSON.stringify(snapshot));"
    ].join(" ")
  ],
  {
    CODE_AGENT_WORKSPACE_ROOTS: peerWorkspaceEnv,
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(multiWorkspaceRepoContext.stdout, "peer-workspace-smoke/peer-module.js", "Expected repo context selection to include source files from a secondary workspace root.");
const workspaceSkillsList = runWithEnv(
  ["./apps/cli/index.js", "skills", "list"],
  {
    CODE_AGENT_WORKSPACE_ROOTS: peerWorkspaceEnv,
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(workspaceSkillsList.stdout, "peer-skill", "Expected skills list to include skills discovered from a secondary workspace root.");
const peerWorkspaceReadTurn = runWithEnv(
  ["./apps/cli/index.js", "run", "请读取 ../peer-workspace-smoke/peer-module.js"],
  {
    CODE_AGENT_HOME: path.join(stateDir, "peer-read"),
    CODE_AGENT_WORKSPACE_ROOTS: peerWorkspaceEnv,
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(peerWorkspaceReadTurn.stdout, "peerValue", "Expected fallback read flow to access files from a secondary workspace root.");
const codeSummaryFallback = runWithEnv(
  ["./apps/cli/index.js", "run", "请梳理 ../peer-workspace-smoke/peer-module.js 的代码"],
  {
    CODE_AGENT_HOME: path.join(stateDir, "peer-summary"),
    CODE_AGENT_WORKSPACE_ROOTS: peerWorkspaceEnv,
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(codeSummaryFallback.stdout, "**Code Summary**", "Expected fallback mode to support explicit code summary requests.");
assertIncludes(codeSummaryFallback.stdout, "peer-workspace-smoke/peer-module.js", "Expected code summary output to surface the secondary workspace file path.");
const strategySet = run(["./apps/cli/index.js", "strategy", "set", "conservative"]);
assertIncludes(strategySet.stdout, "\"strategyMode\": \"conservative\"", "Expected strategy set to persist the selected mode.");
const strategyShow = run(["./apps/cli/index.js", "strategy", "show"]);
assertIncludes(strategyShow.stdout, "\"strategyMode\": \"conservative\"", "Expected strategy show to reflect the persisted mode.");
const strategyToolSet = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.executeTool('set_strategy_mode', { mode: 'autonomous' });",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "strategy-tool"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir
  }
);
assertIncludes(strategyToolSet.stdout, "\"strategyMode\":\"autonomous\"", "Expected the strategy tool to persist and report autonomous mode.");
const strategyToolGet = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.executeTool('get_runtime_settings', {});",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "strategy-tool"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir
  }
);
assertIncludes(strategyToolGet.stdout, "\"strategyMode\":\"autonomous\"", "Expected the strategy tool getter to read the persisted autonomous mode.");
const openaiClientParsing = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "global.fetch = async (url, options) => {",
      "  globalThis.__lastPayload = JSON.parse(options.body);",
      "  return {",
      "    ok: true,",
      "    status: 200,",
      "    headers: { get(name) { return name === 'x-request-id' ? 'chat_req_1' : null; } },",
      "    async json() {",
      "      return {",
      "        id: 'chatcmpl_parse',",
      "        choices: [{ message: {",
      "          content: 'Model says hi.',",
      "          tool_calls: [",
      "            { id: 'call_dashboard', type: 'function', function: { name: 'get_dashboard_summary', arguments: '{}' } },",
      "            { id: 'call_plan', type: 'function', function: { name: 'get_plan_summary', arguments: '{}' } }",
      "          ]",
      "        } }]",
      "      };",
      "    }",
      "  };",
      "};",
      "const { loadConfig } = await import('./packages/shared/config.js');",
      "const { OpenAIResponsesClient } = await import('./packages/llm/openai-responses.js');",
      "const config = loadConfig(process.cwd());",
      "config.openai.apiKey = 'smoke-key';",
      "const client = new OpenAIResponsesClient(config);",
      "const result = await client.createResponse({ instructions: 'hi', conversationItems: [{ role: 'user', content: 'hello' }], toolDefinitions: [], previousResponseId: null, inputItems: null });",
      "console.log(JSON.stringify({ ...result, sentMaxCompletionTokens: globalThis.__lastPayload.max_completion_tokens, sentMaxTokens: globalThis.__lastPayload.max_tokens ?? null }));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "openai-client-parse"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir
  }
);
assertIncludes(openaiClientParsing.stdout, "\"outputText\":\"Model says hi.\"", "Expected chat completions client to recover text from message content.");
assertIncludes(openaiClientParsing.stdout, "\"name\":\"get_dashboard_summary\"", "Expected chat completions client to recover function calls.");
assertIncludes(openaiClientParsing.stdout, "\"name\":\"get_plan_summary\"", "Expected chat completions client to recover function calls.");
assertIncludes(openaiClientParsing.stdout, "\"sentMaxCompletionTokens\":32000", "Expected chat completions client to send max_completion_tokens.");
assertIncludes(openaiClientParsing.stdout, "\"sentMaxTokens\":null", "Expected chat completions client not to send unsupported max_tokens for gpt-5.5.");
const webSearchTool = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "global.fetch = async () => ({",
      "  ok: true,",
      "  async text() {",
      "    return '<html><body><a class=\"result__a\" href=\"https://example.com/article\">Example Result</a><div class=\"result__snippet\">Useful snippet text</div></body></html>';",
      "  }",
      "});",
      "const { loadConfig } = await import('./packages/shared/config.js');",
      "const { AgentRuntime } = await import('./packages/core/runtime.js');",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.executeTool('search_web', { query: 'example result', limit: 3 });",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "web-search-tool"),
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(webSearchTool.stdout, "\"queryProvider\":\"duckduckgo-html\"", "Expected the web-search tool to report its provider.");
assertIncludes(webSearchTool.stdout, "\"title\":\"Example Result\"", "Expected the web-search tool to parse result titles.");
assertIncludes(webSearchTool.stdout, "\"snippet\":\"Useful snippet text\"", "Expected the web-search tool to parse result snippets.");
const fetchUrlTool = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "global.fetch = async () => ({",
      "  ok: true,",
      "  headers: { get(name) { return name === 'content-type' ? 'text/html; charset=utf-8' : null; } },",
      "  async text() {",
      "    return '<html><body><h1>Example Heading</h1><p>Paragraph body.</p></body></html>';",
      "  }",
      "});",
      "const { loadConfig } = await import('./packages/shared/config.js');",
      "const { AgentRuntime } = await import('./packages/core/runtime.js');",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.executeTool('fetch_url', { url: 'https://example.com' });",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "fetch-url-tool"),
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(fetchUrlTool.stdout, "\"contentType\":\"text/html; charset=utf-8\"", "Expected fetch_url to preserve response content type.");
assertIncludes(fetchUrlTool.stdout, "Example Heading", "Expected fetch_url to extract readable HTML text.");
const interactiveSkillHelpers = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "const { getSkillSuggestions, buildSkillCommand, normalizeSkillCommandLine } = await import('./apps/cli/skill-input.js');",
      "const skills = [",
      "  { name: 'using-skills', description: 'Use when a skill may help', source: 'built-in' },",
      "  { name: 'deep-agents-memory', description: 'memory backend routing', source: 'workspace-agents:geometry_videogen' }",
      "];",
      "console.log(JSON.stringify({",
      "  allSuggestions: getSkillSuggestions('/', skills),",
      "  filteredSuggestions: getSkillSuggestions('/deep', skills),",
      "  command: buildSkillCommand('deep-agents-memory'),",
      "  normalized: normalizeSkillCommandLine('/skill deep-agents-memory 帮我保存长期记忆')",
      "}));"
    ].join(" ")
  ],
  {
    CODE_AGENT_DISABLE_DOTENV: "1"
  }
);
assertIncludes(interactiveSkillHelpers.stdout, "\"name\":\"using-skills\"", "Expected slash-trigger suggestions to include available skills.");
assertIncludes(interactiveSkillHelpers.stdout, "\"name\":\"deep-agents-memory\"", "Expected filtered slash suggestions to match skills by name.");
assertIncludes(interactiveSkillHelpers.stdout, "\"command\":\"/skill deep-agents-memory \"", "Expected the interactive helper to build a slash-skill command.");
assertIncludes(interactiveSkillHelpers.stdout, "Use skill \\\"deep-agents-memory\\\" for this request.", "Expected slash-skill input to normalize into a runtime-friendly prompt.");
const agentLoopFollowUp = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "const { runAgentLoop } = await import('./packages/core/agent-loop.js');",
      "const config = { runtime: { maxStepsPerTurn: 6, maxToolOutputChars: 2000, enforceSuggestedFirstTool: false }, openai: { model: 'mock-model' } };",
      "const modelClient = {",
      "  async createResponse({ conversationItems = [] }) {",
      "    const items = conversationItems || [];",
      "    const hasFollowUp = items.some((item) => String(item.content || '').includes('follow-up request'));",
      "    const hasToolResult = items.some((item) => Array.isArray(item.content) && item.content.some((block) => block?.type === 'tool_result'));",
      "    if (hasFollowUp) {",
      "      return { id: 'resp_followup', outputText: 'Handled follow-up request.', functionCalls: [], meta: { provider: 'mock' } };",
      "    }",
      "    if (hasToolResult) {",
      "      return { id: 'resp_tool_done', outputText: 'First tool phase completed.', functionCalls: [], meta: { provider: 'mock' } };",
      "    }",
      "    return { id: 'resp_1', outputText: '', functionCalls: [{ id: 'tool_1', callId: 'tool_1', name: 'list_files', arguments: {} }], meta: { provider: 'mock' } };",
      "  }",
      "};",
      "const toolRegistry = {",
      "  list() { return [{ name: 'list_files', description: 'List files', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, riskLevel: 'safe', requiresConfirmation: false }]; },",
      "  get() { return { name: 'list_files', riskLevel: 'safe' }; }",
      "};",
      "const traces = [];",
      "let followUpDelivered = false;",
      "const result = await runAgentLoop({",
      "  modelClient,",
      "  systemPrompt: 'test',",
      "  conversation: [{ role: 'user', content: 'initial request' }],",
      "  toolRegistry,",
      "  config,",
      "  suggestedFirstTools: [],",
      "  createTrace: async (payload) => traces.push(payload),",
      "  executeTool: async () => ['a.js', 'b.js'],",
      "  getFollowUpMessages: async () => {",
      "    if (followUpDelivered) return [];",
      "    followUpDelivered = true;",
      "    return [{ role: 'user', content: 'follow-up request' }];",
      "  }",
      "});",
      "console.log(JSON.stringify({ result, traces }));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "agent-loop-follow-up"),
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(agentLoopFollowUp.stdout, "\"finalMessage\":\"Handled follow-up request.\"", "Expected agent loop to continue after injecting follow-up messages.");
assertIncludes(agentLoopFollowUp.stdout, "\"source\":\"follow_up\"", "Expected agent loop traces to record follow-up message injection.");
const agentLoopNoHardStepLimit = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "const { runAgentLoop } = await import('./packages/core/agent-loop.js');",
      "const config = { runtime: { maxStepsPerTurn: 3, maxRepeatedToolCallStreak: 50, maxToolOutputChars: 2000, enforceSuggestedFirstTool: false }, openai: { model: 'mock-model' } };",
      "let iteration = 0;",
      "const modelClient = {",
      "  async createResponse() {",
      "    iteration += 1;",
      "    if (iteration > 1) {",
      "      if (iteration >= 8) {",
      "        return { id: `resp_done_${iteration}`, outputText: 'Completed after many tool steps.', functionCalls: [], meta: { provider: 'mock' } };",
      "      }",
      "      return { id: `resp_${iteration}`, outputText: '', functionCalls: [{ id: `tool_${iteration}`, callId: `tool_${iteration}`, name: 'read_file', arguments: { path: `file-${iteration}.js` } }], meta: { provider: 'mock' } };",
      "    }",
      "    return { id: 'resp_start', outputText: '', functionCalls: [{ id: 'tool_0', callId: 'tool_0', name: 'read_file', arguments: { path: 'file-0.js' } }], meta: { provider: 'mock' } };",
      "  }",
      "};",
      "const toolRegistry = {",
      "  list() { return [{ name: 'read_file', description: 'Read file', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, additionalProperties: false }, riskLevel: 'safe', requiresConfirmation: false }]; },",
      "  get() { return { name: 'read_file', riskLevel: 'safe' }; }",
      "};",
      "const result = await runAgentLoop({",
      "  modelClient,",
      "  systemPrompt: 'test',",
      "  conversation: [{ role: 'user', content: 'long tool run' }],",
      "  toolRegistry,",
      "  config,",
      "  createTrace: async () => {},",
      "  executeTool: async (_name, args = {}) => ({ path: args.path, ok: true })",
      "});",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "agent-loop-no-hard-step-limit"),
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(agentLoopNoHardStepLimit.stdout, "\"finalMessage\":\"Completed after many tool steps.\"", "Expected agent loop to continue beyond the legacy step limit.");
const agentLoopStallGuard = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "const { runAgentLoop } = await import('./packages/core/agent-loop.js');",
      "const config = { runtime: { maxRepeatedToolCallStreak: 3, maxToolOutputChars: 2000, enforceSuggestedFirstTool: false }, openai: { model: 'mock-model' } };",
      "let afterWarning = false;",
      "const modelClient = {",
      "  async createResponse({ conversationItems = [] }) {",
      "    const hasWarning = (conversationItems || []).some((item) => String(item.content || '').includes('Loop guard:'));",
      "    if (hasWarning) afterWarning = true;",
      "    const hasToolResult = (conversationItems || []).some((item) => Array.isArray(item.content) && item.content.some((block) => block?.type === 'tool_result'));",
      "    if (hasToolResult || afterWarning) {",
      "      return { id: `resp_repeat_${afterWarning ? 'warn' : 'loop'}`, outputText: '', functionCalls: [{ id: 'repeat_tool', callId: 'repeat_tool', name: 'list_files', arguments: {} }], meta: { provider: 'mock' } };",
      "    }",
      "    return { id: 'resp_start', outputText: '', functionCalls: [{ id: 'repeat_tool', callId: 'repeat_tool', name: 'list_files', arguments: {} }], meta: { provider: 'mock' } };",
      "  }",
      "};",
      "const toolRegistry = {",
      "  list() { return [{ name: 'list_files', description: 'List files', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, riskLevel: 'safe', requiresConfirmation: false }]; },",
      "  get() { return { name: 'list_files', riskLevel: 'safe' }; }",
      "};",
      "const traces = [];",
      "const result = await runAgentLoop({",
      "  modelClient,",
      "  systemPrompt: 'test',",
      "  conversation: [{ role: 'user', content: 'repeat forever' }],",
      "  toolRegistry,",
      "  config,",
      "  createTrace: async (payload) => traces.push(payload),",
      "  executeTool: async () => ['same-output']",
      "});",
      "console.log(JSON.stringify({ result, traces }));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "agent-loop-stall-guard"),
    CODE_AGENT_DISABLE_DOTENV: "1",
    OPENAI_MODEL: "",
  }
);
assertIncludes(agentLoopStallGuard.stdout, "Stopped because the loop appeared stuck repeating tool", "Expected repeated identical tool calls to terminate via stall detection.");
assertIncludes(agentLoopStallGuard.stdout, "\"kind\":\"loop_stall_detected\"", "Expected stall detection to be traced.");
const openaiClientRetry = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "let attempts = 0;",
      "global.fetch = async () => {",
      "  attempts += 1;",
      "  if (attempts === 1) {",
      "    return { ok: false, status: 429, headers: { get(name) { return name === 'retry-after' ? '0' : null; } }, async text() { return 'rate limited'; } };",
      "  }",
      "  return {",
      "    ok: true,",
      "    status: 200,",
      "    headers: { get(name) { return name === 'x-request-id' ? 'req_retry_123' : null; } },",
      "    async json() {",
      "      return { id: 'chatcmpl_retry', choices: [{ message: { content: 'Recovered after retry.' } }] };",
      "    }",
      "  };",
      "};",
      "const { loadConfig } = await import('./packages/shared/config.js');",
      "const { OpenAIResponsesClient } = await import('./packages/llm/openai-responses.js');",
      "const config = loadConfig(process.cwd());",
      "config.openai.apiKey = 'smoke-key';",
      "config.openai.maxRetries = 1;",
      "const client = new OpenAIResponsesClient(config);",
      "const result = await client.createResponse({ instructions: 'hi', conversationItems: [{ role: 'user', content: 'hello' }], toolDefinitions: [], previousResponseId: null, inputItems: null });",
      "console.log(JSON.stringify({ attempts, result }));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "openai-client-retry"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir
  }
);
assertIncludes(openaiClientRetry.stdout, "\"attempts\":2", "Expected chat completions client to retry once after a retryable HTTP failure.");
assertIncludes(openaiClientRetry.stdout, "\"outputText\":\"Recovered after retry.\"", "Expected chat completions client to succeed after retrying a temporary failure.");
assertIncludes(openaiClientRetry.stdout, "\"requestId\":\"req_retry_123\"", "Expected chat completions client to expose provider request ids in metadata.");
const modelTraceMetadata = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "let attempts = 0;",
      "global.fetch = async () => {",
      "  attempts += 1;",
      "  if (attempts === 1) {",
      "    return { ok: false, status: 429, headers: { get(name) { return name === 'retry-after' ? '0' : null; } }, async text() { return 'rate limited'; } };",
      "  }",
      "  return {",
      "    ok: true,",
      "    status: 200,",
      "    headers: { get(name) { return name === 'x-request-id' ? 'req_trace_456' : null; } },",
      "    async json() {",
      "      return { id: 'chatcmpl_trace', choices: [{ message: { content: 'trace ok' } }] };",
      "    }",
      "  };",
      "};",
      "const { loadConfig } = await import('./packages/shared/config.js');",
      "const { AgentRuntime } = await import('./packages/core/runtime.js');",
      "const config = loadConfig(process.cwd());",
      "config.openai.apiKey = 'smoke-key';",
      "config.openai.maxRetries = 1;",
      "const runtime = await AgentRuntime.create(config);",
      "await runtime.runUserTurn('hello trace');",
      "const traces = await runtime.stateStore.listTraces(20);",
      "console.log(JSON.stringify(traces.find((item) => item.kind === 'model_response') || {}));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "openai-trace-metadata"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir,
    CODE_AGENT_DISABLE_DOTENV: "1",
  }
);
assertIncludes(modelTraceMetadata.stdout, "\"provider\":\"openai-chat-completions\"", "Expected model_response traces to include provider metadata.");
assertIncludes(modelTraceMetadata.stdout, "\"providerRequestId\":\"req_trace_456\"", "Expected model_response traces to include provider request ids.");
assertIncludes(modelTraceMetadata.stdout, "\"retryCount\":1", "Expected model_response traces to expose retry counts.");
const runtimeFallbackAfterModelError = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "global.fetch = async () => { throw new TypeError('fetch failed'); };",
      "const { loadConfig } = await import('./packages/shared/config.js');",
      "const { AgentRuntime } = await import('./packages/core/runtime.js');",
      "const config = loadConfig(process.cwd());",
      "config.openai.apiKey = 'smoke-key';",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.runUserTurn('hello fallback');",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "runtime-fallback-after-model-error"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir,
    CODE_AGENT_DISABLE_DOTENV: "1",
  }
);
assertIncludes(runtimeFallbackAfterModelError.stdout, "Model request failed, so the agent used local fallback mode instead:", "Expected runtime to degrade gracefully when the model request fails.");
run(["./apps/cli/index.js", "strategy", "set", "balanced"]);
const planSetStatus = run(["./apps/cli/index.js", "plan", "set-status", "2", "in_progress"]);
assertIncludes(planSetStatus.stdout, "\"status\": \"in_progress\"", "Expected plan set-status to update the targeted item.");
const planRetry = run(["./apps/cli/index.js", "plan", "retry", "2"]);
assertIncludes(planRetry.stdout, "\"status\": \"pending\"", "Expected plan retry to reset a targeted item back to pending.");
const planSkip = run(["./apps/cli/index.js", "plan", "skip", "2"]);
assertIncludes(planSkip.stdout, "\"status\": \"skipped\"", "Expected plan skip to mark a targeted item as skipped.");
run(["./apps/cli/index.js", "plan", "set-status", "4", "in_progress"]);
run(["./apps/cli/index.js", "plan", "set-status", "3", "blocked"]);
const resetBlockedPlan = run(["./apps/cli/index.js", "plan", "reset-blocked"]);
assertIncludes(resetBlockedPlan.stdout, "\"status\": \"in_progress\"", "Expected plan reset-blocked to preserve non-blocked items.");
assertIncludes(resetBlockedPlan.stdout, "\"status\": \"pending\"", "Expected plan reset-blocked to turn blocked items back into pending items.");
assertIncludes(resetBlockedPlan.stdout, "\"status\": \"skipped\"", "Expected plan reset-blocked to preserve skipped plan items.");
const planSummaryBeforeExecute = run(["./apps/cli/index.js", "plan", "summary"]);
assertIncludes(planSummaryBeforeExecute.stdout, "\"planItemCount\":", "Expected plan summary to expose the number of plan items.");
const sessionShow = run(["./apps/cli/index.js", "session", "show"]);
assertIncludes(sessionShow.stdout, "\"transcriptTurnCount\":", "Expected session show to expose the current transcript turn count.");
const sessionHistory = run(["./apps/cli/index.js", "session", "history", "2"]);
assertIncludes(sessionHistory.stdout, "Session History", "Expected session history to render a readable history header.");
assertIncludes(sessionHistory.stdout, "Assistant:", "Expected session history to include assistant replies.");
const peerWorkspaceRead = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.executeTool('list_files', { path: '../peer-workspace-smoke', limit: 20 });",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_HOME: path.join(stateDir, "peer-workspace"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir,
    CODE_AGENT_WORKSPACE_ROOTS: peerWorkspaceEnv
  }
);
assertIncludes(peerWorkspaceRead.stdout, "peer-module.js", "Expected list_files to access the peer workspace root when allowlisted.");
const readonlySubagentRun = run(["./apps/cli/index.js", "subagents", "run-readonly", "smoke readonly subagent", "inspect session and plan state"]);
assertIncludes(readonlySubagentRun.stdout, "\"allowedTools\": [", "Expected readonly subagent runs to report their effective tool set.");
assertIncludes(readonlySubagentRun.stdout, "\"read_file\"", "Expected readonly subagent runs to include read-only tools.");
const writeCapableSubagentRun = run(["./apps/cli/index.js", "subagents", "run", "smoke general subagent", "inspect current repo state"]);
assertIncludes(writeCapableSubagentRun.stdout, "\"recordId\":", "Expected explicit subagent runs to return a saved record id.");
const writeCapableSubagentRecordId = JSON.parse(writeCapableSubagentRun.stdout).recordId;
const subagentReviewStatus = run(["./apps/cli/index.js", "subagents", "set-status", writeCapableSubagentRecordId, "accepted", "safe to adopt"]);
assertIncludes(subagentReviewStatus.stdout, "\"reviewStatus\": \"accepted\"", "Expected subagent status updates to persist an adoption state.");
const subagentSummary = run(["./apps/cli/index.js", "subagents", "summary", "3"]);
assertIncludes(subagentSummary.stdout, "\"totalCount\":", "Expected subagent summary to expose the total number of records.");
assertIncludes(subagentSummary.stdout, "\"countsByStatus\":", "Expected subagent summary to group records by status.");
assertIncludes(subagentSummary.stdout, "\"countsByReviewStatus\":", "Expected subagent summary to group records by review/adoption status.");
const statusAfterRun = run(["./apps/cli/index.js", "status"]);
assertIncludes(statusAfterRun.stdout, "transcriptTurnCount", "Expected status output to expose transcript-backed session state after a run.");
assertIncludes(statusAfterRun.stdout, "\"get_plan_summary\"", "Expected status recommendations to expose the linked plan summary tool.");
run(["./apps/cli/index.js", "plan", "export", "smoke test plan"]);
run(["./apps/cli/index.js", "plan", "execute"]);
const planSummaryAfterExecute = run(["./apps/cli/index.js", "plan", "summary"]);
assertIncludes(planSummaryAfterExecute.stdout, "\"latestPlanRunId\":", "Expected plan summary to link to the most recent plan run.");
assertIncludes(planSummaryAfterExecute.stdout, "\"latestSubagentRecordId\":", "Expected plan summary to expose linked subagent record ids after execution.");
run(["./apps/cli/index.js", "plan-runs", "list"]);
run(["./apps/cli/index.js", "plan-artifacts", "list"]);
const subagentList = run(["./apps/cli/index.js", "subagents", "list"]);
const subagentId = JSON.parse(subagentList.stdout)[0]?.id;
if (!subagentId) {
  throw new Error("Expected at least one subagent record after plan execution.");
}
const subagentRecord = run(["./apps/cli/index.js", "subagents", "show", subagentId]);
assertIncludes(subagentRecord.stdout, "Repository source snippets are not preloaded", "Expected subagent context to avoid preloaded repository snippets.");
run(["./apps/cli/index.js", "reviews", "run", "plan"]);
run(["./apps/cli/index.js", "reviews", "run", "repo"]);
run(["./apps/cli/index.js", "reviews", "run", "code"]);
run(["./apps/cli/index.js", "reviews", "run", "strategy"]);
run(["./apps/cli/index.js", "reviews", "run", "approval"]);
run(["./apps/cli/index.js", "reviews", "bundles", "2"]);
run(["./apps/cli/index.js", "reviews", "export", "", "smoke review"]);
run(["./apps/cli/index.js", "reviews", "list"]);
run(["./apps/cli/index.js", "review-artifacts", "list"]);
run(["./apps/cli/index.js", "workspace", "snapshot", "smoke snapshot one"]);
run(["./apps/cli/index.js", "workspace", "snapshot", "smoke snapshot two"]);
run(["./apps/cli/index.js", "workspace", "snapshots"]);
run(["./apps/cli/index.js", "workspace", "diff"]);
run(["./apps/cli/index.js", "workflow", "run", "smoke workflow"]);
run(["./apps/cli/index.js", "workflow", "list"]);
run(["./apps/cli/index.js", "workflow", "bundles", "2"]);
const approvalList = run(["./apps/cli/index.js", "approvals", "list"]);
const approvalId = JSON.parse(approvalList.stdout)[0]?.id;
if (!approvalId) {
  throw new Error("Expected at least one approval request after workflow reviews.");
}
run(["./apps/cli/index.js", "approvals", "show", approvalId]);
const pendingStatus = run(["./apps/cli/index.js", "status"]);
assertIncludes(pendingStatus.stdout, "\"openApprovalRequestCount\": 1", "Expected pending approval count before resolution.");
assertIncludes(pendingStatus.stdout, "\"latestWorkflowStatusReasons\"", "Expected status output to expose workflow status reasons.");
assertIncludes(pendingStatus.stdout, "\"code\": \"approval_pending\"", "Expected workflow status reasons to expose machine-readable codes.");
assertIncludes(pendingStatus.stdout, "\"list_approval_requests\"", "Expected suggested first tools to pivot toward approval handling while approval is pending.");
assertIncludes(pendingStatus.stdout, "\"governanceSummary\"", "Expected status output to expose unified governance summary.");
const fallbackDashboard = run(["./apps/cli/index.js", "run", "status"]);
assertIncludes(fallbackDashboard.stdout, "Latest workflow reason codes: approval_pending", "Expected fallback summary to surface approval_pending reason codes.");
assertIncludes(fallbackDashboard.stdout, "Governance summary:", "Expected fallback summary to surface unified governance information.");
const governanceHeldPlanRun = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "await runtime.stateStore.updatePlan([{ content: 'governance hold item', status: 'pending' }]);",
      "const result = await runtime.subagentManager.runPlan({ planItems: await runtime.stateStore.getPlanItems(), mode: 'sequential' });",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {}
);
assertIncludes(governanceHeldPlanRun.stdout, "\"governanceHold\":true", "Expected plan execution to enter governance hold while approvals are pending.");
assertIncludes(governanceHeldPlanRun.stdout, "\"status\":\"blocked\"", "Expected governed plan execution to block pending items instead of auto-writing.");
const governanceHeldDirectSubagent = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.subagentManager.runSubagent({ objective: 'direct governed subagent', context: 'attempt write-capable work', allowedTools: ['write_file', 'read_file', 'list_files'] });",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {}
);
assertIncludes(governanceHeldDirectSubagent.stdout, "\"governanceHold\":true", "Expected direct subagent execution to inherit governance hold.");
assertIncludes(governanceHeldDirectSubagent.stdout, "\"allowedTools\":[\"read_file\",\"list_files\"]", "Expected direct governed subagent to be reduced to read-only tools.");
const governanceTraceList = run(["./apps/cli/index.js", "traces", "list", "40"]);
assertIncludes(governanceTraceList.stdout, "\"kind\": \"subagent_governance_hold\"", "Expected governance-hold subagent trace to be recorded.");
assertIncludes(governanceTraceList.stdout, "\"kind\": \"subagent_spawned\"", "Expected subagent spawn trace to record requested/effective tools.");
const governancePlanReview = run(["./apps/cli/index.js", "reviews", "run", "plan"]);
assertIncludes(governancePlanReview.stdout, "governance hold", "Expected plan review to report governance hold while approvals are pending.");
const governanceWorkflowRun = run(["./apps/cli/index.js", "workflow", "run", "governance hold workflow"]);
assertIncludes(governanceWorkflowRun.stdout, "\"code\": \"governance_hold\"", "Expected workflow run under pending approvals to record a governance_hold reason.");
const governanceApprovalReview = run(["./apps/cli/index.js", "reviews", "run", "approval"]);
assertIncludes(governanceApprovalReview.stdout, "Latest workflow governance hold reason", "Expected approval review to report governance hold context.");
const governanceApprovalArtifact = run(["./apps/cli/index.js", "approval-artifacts", "export", approvalId, "governance approval artifact"]);
const governanceApprovalArtifactPath = JSON.parse(governanceApprovalArtifact.stdout).path;
const governanceApprovalArtifactContent = await fs.readFile(resolveArtifactPath(governanceApprovalArtifactPath), "utf8");
assertIncludes(governanceApprovalArtifactContent, "subagent_governance_hold", "Expected approval artifact to include subagent governance hold traces.");
assertIncludes(governanceApprovalArtifactContent, "subagent_spawned", "Expected approval artifact to include subagent spawn traces.");
assertIncludes(governanceApprovalArtifactContent, "### governance_hold", "Expected approval artifact timeline to label governance hold events.");
assertIncludes(governanceApprovalArtifactContent, "### subagent_spawn", "Expected approval artifact timeline to label subagent spawn events.");
assertIncludes(governanceApprovalArtifactContent, "[eventCode=subagent_governance_hold]", "Expected approval artifact timeline to expose stable event codes.");
assertIncludes(governanceApprovalArtifactContent, "[eventCode=subagent_spawned]", "Expected approval artifact timeline to expose subagent spawn event codes.");
const pendingApprovalsAfterGovernance = JSON.parse(run(["./apps/cli/index.js", "approvals", "list"]).stdout)
  .filter((item) => item.status === "pending");
for (const approval of pendingApprovalsAfterGovernance) {
  const resolvedApproval = run(["./apps/cli/index.js", "approvals", "approve", approval.id, "smoke approved"]);
  assertIncludes(resolvedApproval.stdout, "\"status\": \"approved\"", "Expected approval resolution to persist.");
}
const resolvedStatus = run(["./apps/cli/index.js", "status"]);
assertIncludes(resolvedStatus.stdout, "\"openApprovalRequestCount\": 0", "Expected pending approval count to drop after resolution.");
runWithEnv(
  ["./apps/cli/index.js", "run", "check mock tool strategy"],
  {
    CODE_AGENT_HOME: path.join(stateDir, "mock-strategy"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir,
    CODE_AGENT_MOCK_MODEL: "1",
    CODE_AGENT_ENFORCE_SUGGESTED_FIRST_TOOL: "1"
  }
);
const mockTraceList = runWithEnv(
  ["./apps/cli/index.js", "traces", "list", "50"],
  {
    CODE_AGENT_HOME: path.join(stateDir, "mock-strategy"),
    CODE_AGENT_USER_SKILL_DIR: userSkillDir,
    CODE_AGENT_MOCK_MODEL: "1",
    CODE_AGENT_ENFORCE_SUGGESTED_FIRST_TOOL: "1"
  }
);
assertMockStrategyRedirect(mockTraceList.stdout);
run(["./apps/cli/index.js", "workflow", "export"]);
const workflowArtifacts = run(["./apps/cli/index.js", "workflow-artifacts", "list"]);
const workflowArtifactPath = JSON.parse(workflowArtifacts.stdout)[0]?.path;
if (!workflowArtifactPath) {
  throw new Error("Expected at least one workflow artifact after export.");
}
const workflowArtifactContent = await fs.readFile(resolveArtifactPath(workflowArtifactPath), "utf8");
assertIncludes(workflowArtifactContent, "Workflow approval summaries", "Expected exported workflow artifact to include approval summaries.");
assertIncludes(workflowArtifactContent, "Status reasons", "Expected exported workflow artifact to include status reasons.");
assertIncludes(workflowArtifactContent, "approval_pending:", "Expected exported workflow artifact to render coded status reasons.");
run(["./apps/cli/index.js", "traces", "list", "10"]);
run(["./apps/cli/index.js", "traces", "bundles", "5"]);
run(["./apps/cli/index.js", "trace-artifacts", "export", "", "smoke traces"]);
run(["./apps/cli/index.js", "trace-artifacts", "list"]);
run(["./apps/cli/index.js", "config", "show"]);
run(["./apps/cli/index.js", "dashboard", "show"]);
const strictPolicyCheck = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "try {",
      "  await runtime.executeTool('run_shell', { command: 'echo hello' });",
      "  console.log('UNEXPECTED_SUCCESS');",
      "} catch (error) {",
      "  console.log(error.message);",
      "}"
    ].join(" ")
  ],
  {
    CODE_AGENT_MAX_TOOL_RISK: "safe"
  }
);
assertIncludes(strictPolicyCheck.stdout, "blocked by policy", "Expected safe-only policy to block run_shell.");
const policyApprovalList = run(["./apps/cli/index.js", "approvals", "list"]);
assertIncludes(policyApprovalList.stdout, "\"kind\": \"tool_policy_gate\"", "Expected blocked risky tool to create a policy approval request.");
const policyApprovalId = JSON.parse(policyApprovalList.stdout).find((item) => item.kind === "tool_policy_gate")?.id;
if (!policyApprovalId) {
  throw new Error("Expected to find a tool_policy_gate approval request.");
}
const approvalArtifact = run(["./apps/cli/index.js", "approval-artifacts", "export", policyApprovalId, "smoke approval artifact"]);
const approvalArtifactPath = JSON.parse(approvalArtifact.stdout).path;
const approvalArtifactContent = await fs.readFile(resolveArtifactPath(approvalArtifactPath), "utf8");
assertIncludes(approvalArtifactContent, "Change summary", "Expected exported approval artifact to include change summary details.");
assertIncludes(approvalArtifactContent, "## Timeline", "Expected exported approval artifact to include a timeline section.");
run(["./apps/cli/index.js", "approvals", "approve", policyApprovalId, "allow exact run_shell retry"]);
const retryApproval = run(["./apps/cli/index.js", "approvals", "retry", policyApprovalId]);
assertIncludes(retryApproval.stdout, "\"stdout\": \"hello\"", "Expected approval retry command to replay the approved action.");
const approvedPolicyRetry = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const result = await runtime.executeTool('run_shell', { command: 'echo hello' });",
      "console.log(JSON.stringify(result));"
    ].join(" ")
  ],
  {
    CODE_AGENT_MAX_TOOL_RISK: "safe"
  }
);
assertIncludes(approvedPolicyRetry.stdout, "\"stdout\":\"hello\"", "Expected approved policy gate to allow the exact blocked tool call.");
const blockedWriteCheck = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "try {",
      "  await runtime.executeTool('write_file', { path: 'tmp/policy-write.txt', content: 'alpha\\nbeta' });",
      "  console.log('UNEXPECTED_SUCCESS');",
      "} catch (error) {",
      "  console.log(error.message);",
      "}"
    ].join(" ")
  ],
  {
    CODE_AGENT_MAX_TOOL_RISK: "safe"
  }
);
assertIncludes(blockedWriteCheck.stdout, "blocked by policy", "Expected safe-only policy to block write_file.");
const writePolicyApprovals = run(["./apps/cli/index.js", "approvals", "list"]);
assertIncludes(writePolicyApprovals.stdout, "\"changeSummary\": \"write tmp/policy-write.txt with 2 line(s) and 10 character(s)\"", "Expected write_file policy gate to include a readable change summary.");
const blockedPatchCheck = runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "try {",
      "  await runtime.executeTool('apply_patch', { path: 'README.md', search: 'Coding Agent', replace: 'Coding Agent Updated' });",
      "  console.log('UNEXPECTED_SUCCESS');",
      "} catch (error) {",
      "  console.log(error.message);",
      "}"
    ].join(" ")
  ],
  {
    CODE_AGENT_MAX_TOOL_RISK: "safe"
  }
);
assertIncludes(blockedPatchCheck.stdout, "blocked by policy", "Expected safe-only policy to block apply_patch.");
const patchPolicyApprovals = run(["./apps/cli/index.js", "approvals", "list"]);
assertIncludes(patchPolicyApprovals.stdout, "\"changeSummary\": \"patch README.md: \\\"Coding Agent\\\" -> \\\"Coding Agent Updated\\\"\"", "Expected apply_patch policy gate to include before/after snippets.");
const statusWithApprovalSummary = run(["./apps/cli/index.js", "status"]);
assertIncludes(statusWithApprovalSummary.stdout, "\"changeSummary\": \"write tmp/policy-write.txt with 2 line(s) and 10 character(s)\"", "Expected status summary to surface recent approval change summaries.");
run(["./apps/cli/index.js", "bundle-index", "show"]);
run(["./apps/cli/index.js", "bundle-index", "export", "smoke bundle index"]);
run(["./apps/cli/index.js", "bundle-index-artifacts", "list"]);
run(["./apps/cli/index.js", "dashboard", "export", "smoke dashboard"]);
run(["./apps/cli/index.js", "dashboard-artifacts", "list"]);
const machineStateShow = run(["./apps/cli/index.js", "machine-state", "show"]);
assertIncludes(machineStateShow.stdout, "\"schemaVersion\": \"code-agent-state.v1\"", "Expected machine-state snapshot to expose a stable schema version.");
assertIncludes(machineStateShow.stdout, "\"currentPlanSummary\"", "Expected machine-state snapshot to expose linked current plan summary details.");
assertIncludes(machineStateShow.stdout, "\"recommendedActions\"", "Expected machine-state snapshot to expose structured next actions.");
assertIncludes(machineStateShow.stdout, "\"strategyMode\":", "Expected machine-state snapshot to expose the persisted strategy mode.");
const machineStateUi = run(["./apps/cli/index.js", "machine-state", "ui"]);
assertIncludes(machineStateUi.stdout, "\"schemaVersion\": \"code-agent-ui-state.v1\"", "Expected machine-state UI payload to expose a stable UI schema version.");
assertIncludes(machineStateUi.stdout, "\"sections\"", "Expected machine-state UI payload to include grouped sections.");
assertIncludes(machineStateUi.stdout, "\"Linked Subagents\"", "Expected machine-state UI payload to expose linked subagent cards.");
assertIncludes(machineStateUi.stdout, "\"Strategy Mode\"", "Expected machine-state UI payload to expose the strategy card.");
const machineStateUiExport = run(["./apps/cli/index.js", "machine-state", "ui-export", "smoke ui state"]);
const machineStateUiPath = JSON.parse(machineStateUiExport.stdout).path;
const machineStateUiContent = await fs.readFile(resolveArtifactPath(machineStateUiPath), "utf8");
assertIncludes(machineStateUiContent, "\"schemaVersion\": \"code-agent-ui-state.v1\"", "Expected exported UI-state artifact to include the UI schema version.");
const machineStateUiHtmlExport = run(["./apps/cli/index.js", "machine-state", "ui-html-export", "smoke ui html"]);
const machineStateUiHtmlPath = JSON.parse(machineStateUiHtmlExport.stdout).path;
const machineStateUiHtmlContent = await fs.readFile(resolveArtifactPath(machineStateUiHtmlPath), "utf8");
assertIncludes(machineStateUiHtmlContent, "<!doctype html>", "Expected exported UI HTML artifact to be a real HTML document.");
assertIncludes(machineStateUiHtmlContent, "code-agent-ui-state.v1", "Expected exported UI HTML artifact to render the UI schema identifier.");
assertIncludes(machineStateUiHtmlContent, "Strategy:", "Expected exported UI HTML artifact to render the strategy mode.");
const machineStateUiDemoExport = run(["./apps/cli/index.js", "machine-state", "ui-demo-export", "smoke ui demo"]);
const machineStateUiDemoPath = JSON.parse(machineStateUiDemoExport.stdout).path;
const machineStateUiDemoContent = await fs.readFile(resolveArtifactPath(machineStateUiDemoPath), "utf8");
assertIncludes(machineStateUiDemoContent, "smoke ui demo", "Expected exported UI demo artifact to render the provided demo title.");
assertIncludes(machineStateUiDemoContent, "State Artifact Index", "Expected exported UI demo artifact to include the state artifact index.");
const machineStateSummary = run(["./apps/cli/index.js", "machine-state", "summary"]);
assertIncludes(machineStateSummary.stdout, "\"schemaVersion\": \"code-agent-state-summary.v1\"", "Expected machine-state summary to expose a stable summary schema version.");
assertIncludes(machineStateSummary.stdout, "\"lastBlockerCode\"", "Expected machine-state summary to expose blocked-goal governance metadata.");
const machineStateIndex = run(["./apps/cli/index.js", "machine-state", "index"]);
assertIncludes(machineStateIndex.stdout, "\"schemaVersion\": \"code-agent-state-artifact-index.v1\"", "Expected machine-state index to expose a stable index schema version.");
assertIncludes(machineStateIndex.stdout, "\"countsByKind\"", "Expected machine-state index to expose counts by artifact kind.");
assertIncludes(machineStateIndex.stdout, "\"latestByKind\"", "Expected machine-state index to expose latest artifacts by kind.");
const machineStateIndexExport = run(["./apps/cli/index.js", "machine-state", "index-export", "smoke state index"]);
const machineStateIndexPath = JSON.parse(machineStateIndexExport.stdout).path;
const machineStateIndexContent = await fs.readFile(resolveArtifactPath(machineStateIndexPath), "utf8");
assertIncludes(machineStateIndexContent, "\"schemaVersion\": \"code-agent-state-artifact-index.v1\"", "Expected exported machine-state index artifact to include the index schema version.");
const machineStateDemoExport = run(["./apps/cli/index.js", "machine-state", "demo-export", "smoke integration demo"]);
const machineStateDemoPath = JSON.parse(machineStateDemoExport.stdout).path;
const machineStateDemoContent = await fs.readFile(resolveArtifactPath(machineStateDemoPath), "utf8");
assertIncludes(machineStateDemoContent, "smoke integration demo", "Expected exported machine-state demo page to render the provided demo title.");
assertIncludes(machineStateDemoContent, "Docs Index", "Expected exported machine-state demo page to include docs navigation.");
const machineStateSchema = run(["./apps/cli/index.js", "machine-state", "schema"]);
assertIncludes(machineStateSchema.stdout, "\"$id\": \"code-agent-state.v1\"", "Expected machine-state schema command to expose the schema id.");
const machineStateExport = run(["./apps/cli/index.js", "machine-state", "export", "smoke machine state"]);
const machineStatePath = JSON.parse(machineStateExport.stdout).path;
const machineStateContent = await fs.readFile(resolveArtifactPath(machineStatePath), "utf8");
assertIncludes(machineStateContent, "\"schemaVersion\": \"code-agent-state.v1\"", "Expected exported machine-state artifact to include schemaVersion.");
const machineStateArtifacts = run(["./apps/cli/index.js", "machine-state-artifacts", "list"]);
const machineStateArtifactId = JSON.parse(machineStateArtifacts.stdout)[0]?.id;
if (!machineStateArtifactId) {
  throw new Error("Expected at least one machine-state artifact after export.");
}
const machineStateDiff = run(["./apps/cli/index.js", "machine-state", "diff", machineStateArtifactId]);
assertIncludes(machineStateDiff.stdout, "\"schemaVersion\": \"code-agent-state-diff.v1\"", "Expected machine-state diff to expose a stable diff schema version.");
assertIncludes(machineStateDiff.stdout, "\"summary\"", "Expected machine-state diff to include a compact summary layer.");
assertIncludes(machineStateDiff.stdout, "\"byCategory\"", "Expected machine-state diff summary to include grouped category changes.");
run(["./apps/cli/index.js", "machine-state-artifacts", "list"]);
const customArtifactRoot = path.join(stateDir, "external-artifacts");
const customArtifactExport = runWithEnv(
  ["./apps/cli/index.js", "machine-state", "export", "external artifact root"],
  {
    CODE_AGENT_ARTIFACTS_DIR: customArtifactRoot
  }
);
const customArtifactPath = JSON.parse(customArtifactExport.stdout).path;
assertIncludes(customArtifactPath, "__code_agent_artifacts__/agent-state/", "Expected external artifact roots to be stored with an external artifact prefix.");
const customArtifactAbsolutePath = resolveArtifactPath(customArtifactPath, { CODE_AGENT_ARTIFACTS_DIR: customArtifactRoot });
assertIncludes(customArtifactAbsolutePath, customArtifactRoot, "Expected external artifact records to resolve inside the configured artifact root.");
const customArtifactContent = await fs.readFile(customArtifactAbsolutePath, "utf8");
assertIncludes(customArtifactContent, "\"schemaVersion\": \"code-agent-state.v1\"", "Expected external-root machine-state export to remain readable.");
const docsIndex = await fs.readFile(path.join(root, "docs", "README.md"), "utf8");
assertIncludes(docsIndex, "Machine-State API Contract", "Expected docs index to link integration references.");
assertIncludes(docsIndex, "Preview Home API", "Expected docs index to link the preview-home API contract.");
assertIncludes(docsIndex, "Integration Guide", "Expected docs index to link the integration guide.");
assertIncludes(docsIndex, "Demo App", "Expected docs index to link the demo app.");
assertIncludes(docsIndex, "Changelog", "Expected docs index to link the changelog.");
assertIncludes(docsIndex, "Release Guide", "Expected docs index to link the release guide.");
assertIncludes(docsIndex, "Roadmap", "Expected docs index to link the roadmap.");
assertIncludes(docsIndex, "Bundle Summary Schema", "Expected docs index to link the bundle summary schema.");
assertIncludes(docsIndex, "Codex Plugin Manifest", "Expected docs index to link the codex plugin manifest.");
assertIncludes(docsIndex, "Release Packaging", "Expected docs index to link the release packaging guide.");
assertIncludes(docsIndex, "Codex Plugin Packaging", "Expected docs index to link the codex plugin packaging guide.");
const integrationGuide = await fs.readFile(path.join(root, "docs", "integration-guide.md"), "utf8");
assertIncludes(integrationGuide, "machine-state ui-html-export", "Expected integration guide to document the UI HTML export flow.");
const previewHomeApi = await fs.readFile(path.join(root, "docs", "preview-home-api.md"), "utf8");
assertIncludes(previewHomeApi, "code-agent-preview-home.v1", "Expected preview-home API doc to mention the preview schema version.");
const changelog = await fs.readFile(path.join(root, "CHANGELOG.md"), "utf8");
assertIncludes(changelog, "Initial vertically integrated coding-agent release.", "Expected changelog to summarize the initial release.");
const releaseGuide = await fs.readFile(path.join(root, "RELEASE.md"), "utf8");
assertIncludes(releaseGuide, "Do not claim release readiness without fresh passing runs.", "Expected release guide to include verification discipline.");
const roadmap = await fs.readFile(path.join(root, "ROADMAP.md"), "utf8");
assertIncludes(roadmap, "Near-Term", "Expected roadmap to define near-term work.");
const bundleSummarySchema = await fs.readFile(path.join(root, "docs", "bundle-summary-schema.md"), "utf8");
assertIncludes(bundleSummarySchema, "code-agent-bundle-summary.v1", "Expected bundle summary schema doc to mention the bundle summary schema version.");
const releasePackaging = await fs.readFile(path.join(root, "docs", "release-packaging.md"), "utf8");
assertIncludes(releasePackaging, "package-release.sh", "Expected release packaging doc to mention the release packaging script.");
const codexPluginManifest = await fs.readFile(path.join(root, ".codex-plugin", "plugin.json"), "utf8");
assertIncludes(codexPluginManifest, "\"hooks\": \"./hooks/hooks-codex.json\"", "Expected codex plugin manifest to reference codex hooks.");
const codexHook = await fs.readFile(path.join(root, "hooks", "session-start-codex"), "utf8");
assertIncludes(codexHook, "using-skills", "Expected codex session-start hook to inject the using-skills bootstrap.");
const codexPackagingDoc = await fs.readFile(path.join(root, "docs", "codex-plugin-packaging.md"), "utf8");
assertIncludes(codexPackagingDoc, "package-codex-plugin.sh", "Expected codex packaging doc to mention the packaging script.");
runShell("bash ./scripts/package-codex-plugin.sh");
const packagedPluginManifest = await fs.readFile(path.join(root, "dist", "code-agent-codex-plugin", ".codex-plugin", "plugin.json"), "utf8");
assertIncludes(packagedPluginManifest, "\"name\": \"code-agent\"", "Expected packaged codex plugin bundle to include the plugin manifest.");
const packagedHook = await fs.readFile(path.join(root, "dist", "code-agent-codex-plugin", "hooks", "session-start-codex"), "utf8");
assertIncludes(packagedHook, "using-skills", "Expected packaged codex plugin bundle to include the session-start hook.");
const packagedPluginSummary = await fs.readFile(path.join(root, "dist", "code-agent-codex-plugin", "bundle-summary.json"), "utf8");
assertIncludes(packagedPluginSummary, "\"bundleType\": \"codex-plugin\"", "Expected packaged codex plugin bundle to include a codex-plugin summary manifest.");
runShell("bash ./scripts/package-release.sh");
const packagedReleaseReadme = await fs.readFile(path.join(root, "dist", "code-agent-release", "README.md"), "utf8");
assertIncludes(packagedReleaseReadme, "Coding Agent", "Expected packaged release bundle to include the project README.");
const packagedReleaseDemo = await fs.readFile(path.join(root, "dist", "code-agent-release", "apps", "demo", "index.html"), "utf8");
assertIncludes(packagedReleaseDemo, "Machine State Demo", "Expected packaged release bundle to include the demo app.");
const packagedReleaseSummary = await fs.readFile(path.join(root, "dist", "code-agent-release", "bundle-summary.json"), "utf8");
assertIncludes(packagedReleaseSummary, "\"bundleType\": \"release\"", "Expected packaged release bundle to include a release summary manifest.");
const packagedReleaseIndex = await fs.readFile(path.join(root, "dist", "code-agent-release", "index.html"), "utf8");
assertIncludes(packagedReleaseIndex, "Code Agent Release Bundle", "Expected packaged release bundle to include a top-level index page.");
const demoAppReadme = await fs.readFile(path.join(root, "apps", "demo", "README.md"), "utf8");
assertIncludes(demoAppReadme, "code-agent-ui-state.v1", "Expected demo app readme to document the ui-state schema.");
const demoIndex = await fs.readFile(path.join(root, "apps", "demo", "index.html"), "utf8");
assertIncludes(demoIndex, "Machine State Demo", "Expected demo app HTML to render the machine-state demo shell.");
assertIncludes(demoIndex, "Load Current Preview State", "Expected demo app HTML to expose the quick preview-state button.");
assertIncludes(demoIndex, "preview-filter", "Expected demo app HTML to expose a preview filter control.");
assertIncludes(demoIndex, "summary-bar", "Expected demo app HTML to expose the summary bar container.");
assertIncludes(demoIndex, "filter-pills", "Expected demo app HTML to expose the filter pills container.");
const demoMain = await fs.readFile(path.join(root, "apps", "demo", "main.js"), "utf8");
assertIncludes(demoMain, "latestByKindEl", "Expected demo app script to bind the state artifact index fields.");
assertIncludes(demoMain, "applyPreviewState", "Expected demo app script to support preview-state ingestion.");
assertIncludes(demoMain, "loadPreviewButton", "Expected demo app script to wire the quick preview-state button.");
assertIncludes(demoMain, "autoLoadPreviewStateOnStartup", "Expected demo app script to attempt preview-state auto-loading on startup.");
assertIncludes(demoMain, "renderSummaryBar", "Expected demo app script to render the top summary bar.");
assertIncludes(demoMain, "renderPill(\"Source\"", "Expected demo app summary bar to expose the current data source.");
assertIncludes(demoMain, "renderFilterPills", "Expected demo app script to render top filter pills.");
assertIncludes(demoMain, "goal-blocked", "Expected demo app script to expose the goal-blocked filter option.");
assertIncludes(demoMain, "resolvePreviewUrl", "Expected demo app script to compute a filter-aware preview-state URL.");
assertIncludes(demoMain, "syncPreviewUrlWithFilter", "Expected demo app script to synchronize the selected filter into the preview URL.");
assertIncludes(demoMain, "force: true", "Expected filter changes to force-refresh the preview-state source.");
assertIncludes(demoMain, "history.replaceState", "Expected demo app script to synchronize the selected filter into the browser URL.");
assertIncludes(demoMain, "section-card-grid", "Expected demo app script to render sections as card grids.");
assertIncludes(demoMain, "filter: ${filter}", "Expected demo app status message to include the current filter.");
await assertDemoPreviewServesPage();
run(["./apps/cli/index.js", "repo", "status"]);
runWithEnv(
  [
    "--input-type=module",
    "--eval",
    [
      "import { loadConfig } from './packages/shared/config.js';",
      "import { AgentRuntime } from './packages/core/runtime.js';",
      "const config = loadConfig(process.cwd());",
      "const runtime = await AgentRuntime.create(config);",
      "const now = new Date().toISOString();",
      "await runtime.stateStore.saveApprovalRequest({",
      "  id: 'approval_mock_pending',",
      "  createdAt: now,",
      "  updatedAt: now,",
      "  status: 'pending',",
      "  kind: 'tool_policy_gate',",
      "  title: 'mock approval pending',",
      "  summary: 'pending approval for mock strategy',",
      "  toolName: 'write_file',",
      "  arguments: { path: 'tmp/mock.txt', content: 'pending' }",
      "});"
    ].join(" ")
  ],
  {
    CODE_AGENT_MOCK_MODEL: "1"
  }
);
runWithEnv(
  ["./apps/cli/index.js", "run", "please inspect pending approvals"],
  {
    CODE_AGENT_MOCK_MODEL: "1"
  }
);
const mockApprovalTraceList = runWithEnv(
  ["./apps/cli/index.js", "traces", "list", "80"],
  {
    CODE_AGENT_MOCK_MODEL: "1"
  }
);
assertMockApprovalFirstTool(mockApprovalTraceList.stdout);
run(["./apps/cli/index.js", "goal", "cancel"]);
assertIncludes(run(["./apps/cli/index.js", "goal", "show"]).stdout, "No active goal.", "Expected cancelling the active goal to clear goal show output.");
run(["./apps/cli/index.js", "goal", "resume", initialGoalId]);
const resumedGoal = run(["./apps/cli/index.js", "goal", "show"]);
assertIncludes(resumedGoal.stdout, `"id": "${initialGoalId}"`, "Expected goal resume to reactivate the original goal.");
run(["./apps/cli/index.js", "goal", "complete"]);
run(["./apps/cli/index.js", "run", "hello"]);

await fs.rm(stateDir, { recursive: true, force: true });
await fs.rm(peerWorkspaceDir, { recursive: true, force: true });
console.log("Smoke test passed.");

function run(args) {
  const result = spawnSync(nodeBin, args, {
    cwd: root,
    env,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`Smoke command failed: ${args.join(" ")}`);
  }

  return result;
}

function runWithEnv(args, extraEnv) {
  const result = spawnSync(nodeBin, args, {
    cwd: root,
    env: {
      ...env,
      ...extraEnv
    },
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`Smoke command failed: ${args.join(" ")}`);
  }

  return result;
}

function runShell(command) {
  const result = spawnSync("zsh", ["-lc", command], {
    cwd: root,
    env,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`Smoke shell command failed: ${command}`);
  }

  return result;
}

function resolveArtifactPath(storedPath, extraEnv = {}) {
  const mergedEnv = {
    ...env,
    ...extraEnv
  };
  const config = {
    projectRoot: root,
    artifactRootDir: mergedEnv.CODE_AGENT_ARTIFACTS_DIR
      ? path.resolve(mergedEnv.CODE_AGENT_ARTIFACTS_DIR)
      : path.join(root, "docs")
  };
  return resolveArtifactRecordPath(config, storedPath);
}

async function assertDemoPreviewServesPage() {
  const port = 4193;
  const child = spawn(nodeBin, ["./apps/demo/server.js", String(port)], {
    cwd: root,
    env,
    stdio: "ignore"
  });

  try {
    const home = await fetchText(`http://127.0.0.1:${port}/`);
    assertIncludes(home, "Code Agent Preview Home", "Expected demo preview server to serve the preview home page.");
    assertIncludes(home, "Demo App", "Expected preview home page to link to the demo app.");
    assertIncludes(home, "Latest Snapshot", "Expected preview home page to show latest artifact cards.");
    assertIncludes(home, "Latest Approval Artifact", "Expected preview home page to show latest approval artifact card.");
    assertIncludes(home, "Current State Summary", "Expected preview home page to embed the latest machine-state summary.");
    assertIncludes(home, "Strategy mode:", "Expected preview home page to surface the current strategy mode.");
    assertIncludes(home, "latest ui-state", "Expected preview home page to embed the latest ui-state summary block.");
    assertIncludes(home, "Reason Codes", "Expected preview home page to render ui-state section cards.");
    assertIncludes(home, "section-card-grid", "Expected preview home page to render section cards instead of plain lists.");
    assertIncludes(home, "link-card-grid", "Expected preview home page to render card-based navigation sections.");
    assertIncludes(home, "governance-hold", "Expected preview home page to render governance status chips.");
    assertIncludes(home, "Attention Needed", "Expected preview home page to surface attention-needed artifacts.");
    assertIncludes(home, "Recent Events", "Expected preview home page to render the recent events feed.");
    assertIncludes(home, "Latest Audit Artifacts", "Expected preview home page to render latest audit artifact cards.");
    const filteredHome = await fetchText(`http://127.0.0.1:${port}/?state=approval-pending`);
    assertIncludes(filteredHome, "approval-pending", "Expected preview home filter view to mention the active approval-pending state.");
    assertIncludes(filteredHome, "pending approvals, workflow blockers", "Expected filtered preview home to render state-specific explanatory copy.");
    assertIncludes(filteredHome, "Approval State Summary", "Expected filtered preview home to render state-specific section titles.");
    assertIncludes(filteredHome, "Approval Events", "Expected filtered preview home to rename recent events for the approval-pending state.");
    assertIncludes(filteredHome, "Open Approvals", "Expected filtered preview home to render resolved approval card content.");
    assertIncludes(filteredHome, "Pending approval artifact", "Expected filtered preview home to keep approval-focused entries visible.");
    assertIncludes(filteredHome, "Latest Approval Audit", "Expected filtered preview home to keep approval-focused audit cards visible.");
    assertIncludes(filteredHome, "Approval Artifacts", "Expected filtered preview home to prioritize approval audit entry points.");
    assertIncludes(filteredHome, "Resolve approvals", "Expected filtered preview home to show structured approval-focused recommended actions.");
    assertIncludes(filteredHome, "Pending approvals detected", "Expected filtered preview home to prioritize approval-related recent events.");
    if (filteredHome.indexOf("Recommended Actions") > filteredHome.indexOf("Recent JSON State Artifacts")) {
      throw new Error("Expected approval-pending view to prioritize recommended actions ahead of recent JSON state artifacts.");
    }
    const homeJson = await fetchText(`http://127.0.0.1:${port}/preview-state.json?state=approval-pending`);
    assertIncludes(homeJson, "\"schemaVersion\": \"code-agent-preview-home.v1\"", "Expected preview JSON endpoint to expose a stable schema version.");
    assertIncludes(homeJson, "\"stateFilter\": \"approval-pending\"", "Expected preview JSON endpoint to reflect the active filter.");
    const blockedHome = await fetchText(`http://127.0.0.1:${port}/?state=goal-blocked`);
    assertIncludes(blockedHome, "goal-blocked", "Expected preview home to expose the goal-blocked filter state.");
    assertIncludes(blockedHome, "Blocked Goal Summary", "Expected goal-blocked preview home to render goal-focused section labels.");
    assertIncludes(blockedHome, "Goal Recovery Actions", "Expected goal-blocked preview home to render recovery guidance.");
    const blockedJson = await fetchText(`http://127.0.0.1:${port}/preview-state.json?state=goal-blocked`);
    assertIncludes(blockedJson, "\"stateFilter\": \"goal-blocked\"", "Expected preview JSON endpoint to expose the goal-blocked filter.");
    assertIncludes(home, "Recent HTML Views", "Expected preview home page to group exported HTML views.");
    assertIncludes(home, "Recent JSON State Artifacts", "Expected preview home page to group exported JSON artifacts.");
    assertIncludes(home, "Audit Surfaces", "Expected preview home page to group audit links.");
    const html = await fetchText(`http://127.0.0.1:${port}/apps/demo/index.html`);
    assertIncludes(html, "Machine State Demo", "Expected demo preview server to serve the demo page.");
  } finally {
    child.kill("SIGTERM");
  }
}

async function fetchText(url) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < 10000) {
    try {
      const text = await new Promise((resolve, reject) => {
        http.get(url, (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            if (response.statusCode !== 200) {
              reject(new Error(`HTTP ${response.statusCode}`));
              return;
            }
            resolve(body);
          });
        }).on("error", reject);
      });
      return text;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Timed out fetching ${url}`);
}

function assertMockStrategyRedirect(stdout) {
  const traces = JSON.parse(stdout);
  const hasStrategy = traces.some((trace) => trace.kind === "first_tool_strategy");
  const hasRedirect = traces.some((trace) => trace.kind === "first_tool_strategy_redirect");
  if (!hasStrategy || !hasRedirect) {
    throw new Error("Mock strategy regression: expected both first_tool_strategy and first_tool_strategy_redirect traces.");
  }
}

function assertMockApprovalFirstTool(stdout) {
  const traces = JSON.parse(stdout);
  const approvalStrategy = traces.find((trace) => {
    return trace.kind === "first_tool_strategy" && ["list_approval_requests", "read_approval_request", "read_approval_artifact"].includes(trace.chosenTool);
  });
  if (approvalStrategy) {
    return;
  }
  const mockRunObserved = traces.some((trace) => trace.kind === "model_response" || trace.kind === "turn_end");
  if (!mockRunObserved) {
    throw new Error("Mock approval regression: expected the mock approval run to emit trace activity.");
  }
}

function assertIncludes(stdout, needle, message) {
  if (!stdout.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(stdout, needle, message) {
  if (stdout.includes(needle)) {
    throw new Error(message);
  }
}
