# Codex-Like Coding Agent Implementation Plan

## 1. Target

Build a terminal-first coding agent that:

- Starts with the launch directory as the default project root
- Accepts natural-language instructions from the user in an interactive CLI
- Reads project files, reasons about the task, uses tools, and edits code
- Loads and executes `SKILL.md`-style workflows when relevant
- Can delegate bounded subtasks to subagents
- Supports goal-oriented execution with governance similar to `/goal`
- Maintains context and memory across turns without flooding the model context

This document focuses on implementation planning, not exact replication of Codex internals.

## 2. Design Principles

Use the following principles as the baseline:

- Local-first: default all file operations to the current working directory
- Tool-first: prefer explicit tool calls over “imagined” capabilities
- Progressive disclosure: only load the minimum context needed
- Safe editing: inspect before editing, patch rather than overwrite
- Bounded autonomy: continue tasks end-to-end, but gate risky actions
- Deterministic orchestration: the runtime, not the model alone, decides what tools are callable
- Traceability: every action, tool call, and edit should be logged

## 3. High-Level Architecture

Recommended codebase layout:

```text
code-agent/
├── apps/
│   └── cli/
├── packages/
│   ├── core/              # agent loop, policies, state machine
│   ├── llm/               # model adapters and prompt assembly
│   ├── tools/             # tool registry and tool executors
│   ├── skills/            # skill discovery and loading
│   ├── memory/            # session memory and long-term memory
│   ├── subagents/         # subagent scheduling and merge
│   ├── context/           # repo indexing and context budgeting
│   ├── goals/             # /goal mode governance
│   ├── edits/             # diff, patch, verification
│   └── shared/
└── docs/
```

Suggested stack:

- Language: TypeScript
- Runtime: Node.js
- CLI: `commander` or `cac`
- LLM API: Responses API or equivalent agent-friendly interface
- Storage:
  - SQLite for sessions, goals, memory, tool traces
  - Local files for skills and prompt templates
- Search/index:
  - `ripgrep` for file discovery
  - lightweight embeddings optionally added later

## 4. Runtime Loop

Core loop per user turn:

1. Read user input from terminal
2. Load session state, project root, active goal, and memory summary
3. Inspect available tools, skills, and policies
4. Build the system prompt and working context
5. Ask the model for the next action
6. If the model requests tools, execute them through the orchestrator
7. Append tool results to the working trace
8. Repeat until the model emits a final user-facing answer
9. Persist summary, memory updates, tool traces, and file edit results

This should be implemented as a small state machine, not a loose recursive loop.

Recommended states:

- `idle`
- `planning`
- `tool_calling`
- `awaiting_tool_result`
- `subagent_running`
- `verifying`
- `responding`
- `blocked`

## 5. Tooling System

### 5.1 Tool Categories

Start with a minimal but strong toolset:

- File tools
  - list files
  - read file
  - search text
  - apply patch
  - write new file
- Shell tools
  - run command
  - stream stdout/stderr
- Git tools
  - status
  - diff
  - log
- Planning/state tools
  - update plan
  - create goal
  - update goal
- Memory tools
  - save memory
  - search memory
- Skill tools
  - list skills
  - read skill
- Subagent tools
  - spawn subagent
  - collect subagent result

Later additions:

- Web/browser tools
- Doc/sheet/PDF tools
- MCP-compatible external tools

### 5.2 Tool Contract

Each tool should expose:

- `name`
- `description`
- `inputSchema`
- `riskLevel`
- `timeoutMs`
- `requiresConfirmation`
- `execute()`

Important implementation detail:
the model should never call host code directly. It only emits structured tool requests; the orchestrator validates and executes them.

### 5.3 Safe Tool Governance

Define policy levels:

- `safe`: read-only, no confirmation
- `caution`: workspace writes, normal shell commands
- `restricted`: network, destructive shell, out-of-root writes
- `forbidden`: blocked by runtime policy

The agent runtime should enforce these rules even if the model asks otherwise.

## 6. Skill System

### 6.1 Skill Format

Adopt the same progressive-disclosure pattern:

- skill metadata comes from `SKILL.md` frontmatter
- only metadata is indexed globally
- full `SKILL.md` body is loaded when the skill triggers
- linked `references/`, `scripts/`, and `assets/` are loaded only when needed

Example layout:

```text
skills/
└── react-refactor/
    ├── SKILL.md
    ├── references/
    ├── scripts/
    └── assets/
```

### 6.2 Skill Triggering

Use a two-stage trigger:

1. Cheap routing using metadata similarity:
   - user message
   - repo signals
   - current goal
2. Model confirmation:
   - “Use skill X because task matches Y”

This avoids loading many skills into context at once.

### 6.3 Skill Loading Rules

Implement explicit loading rules:

- Read `SKILL.md` fully before using the skill
- Resolve relative paths from the skill directory
- Only load referenced documents that are relevant to the current task
- Prefer running bundled scripts instead of regenerating large code blocks

### 6.4 Skill Sources

Support at least three locations:

- built-in system skills
- user-global skills
- repo-local skills

Precedence:

1. repo-local
2. user-global
3. built-in

## 7. Subagent Delegation

### 7.1 Why Subagents Exist

Subagents should be used for bounded, parallelizable, or isolatable work, for example:

- independent code search in multiple folders
- test failure triage
- alternative solution exploration
- validating a skill on a realistic subtask

### 7.2 Delegation Rules

A subagent request should include:

- objective
- scope
- allowed tools
- output contract
- context budget
- timeout

Do not give subagents the entire parent conversation by default.
Pass only:

- the exact task
- relevant files or summaries
- allowed policies
- expected deliverable

### 7.3 Merge Strategy

The parent agent remains the decision-maker.
Subagents return structured results:

- summary
- findings
- proposed edits
- uncertainty
- artifacts

Parent workflow:

1. validate subagent output
2. optionally inspect affected files
3. apply or reject changes
4. synthesize final answer

### 7.4 Initial Implementation Choice

Phase 1 can implement subagents as isolated child sessions using the same model and tool runtime, but with:

- fresh short-lived state
- reduced tool set
- tighter token budgets

## 8. Goal Mode Governance

Implement `/goal` as an explicit persistent execution mode, not just a prompt style.

### 8.1 Goal Object

Store:

- `id`
- `objective`
- `status` (`active`, `complete`, `blocked`)
- `createdAt`
- `updatedAt`
- `tokenBudget` optional
- `tokenUsed`
- `turnCount`
- `blockCount`
- `completionCriteria`

### 8.2 Goal Semantics

Rules:

- a goal is created only by explicit user request
- it stays active across turns
- the agent should keep orienting decisions toward the active goal
- completion must be explicit and evidence-based
- blocked status should only happen after repeated inability to progress

### 8.3 Goal Governance Logic

Recommended blocked policy:

- if the same blocking condition happens for 3 consecutive goal turns, mark `blocked`
- if the user resumes later, restart the blocked audit

This mirrors the governance style you referenced and keeps the runtime, not the model, in charge of status transitions.

### 8.4 Goal UI

CLI commands:

- `/goal create <text>`
- `/goal show`
- `/goal complete`
- `/goal cancel`
- `/goal resume`

## 9. Context Management

Context management is the core engineering problem.

### 9.1 Context Layers

Build prompt context in layers:

1. System prompt
2. Runtime policy and tool schema
3. Active goal summary
4. Session summary
5. Relevant memories
6. Relevant repo context
7. Relevant skills
8. Current turn messages
9. Recent tool results

### 9.2 Repo Context Strategy

Do not dump files directly into the prompt.
Use staged context retrieval:

- phase A: discover candidate files with `rg`, git diff, package manifests
- phase B: read only top-ranked files
- phase C: summarize file content into working notes

Useful signals for ranking:

- direct filename matches from the user prompt
- recently edited files
- imports/call graph proximity
- test failures
- files referenced by skills

### 9.3 Working Memory Window

Maintain a short-lived “scratchpad summary” separate from raw transcript:

- current task interpretation
- files inspected
- assumptions
- open questions
- pending tool results
- chosen plan

This summary is regenerated every turn and replaces long raw traces.

### 9.4 Context Budgeting

Reserve approximate budget buckets:

- 20% system + policies + tools
- 20% active goal + memory + session summary
- 40% repo/skill/task context
- 20% response and tool decision slack

Make these tunable in config.

## 10. Memory Management

Split memory into three types.

### 10.1 Session Memory

Ephemeral, per thread/session:

- recent decisions
- current repo assumptions
- temporary aliases
- plan summary

### 10.2 Durable User Memory

Cross-session, low-frequency facts only:

- user coding preferences
- preferred languages/frameworks
- formatting conventions
- recurring project habits

Only write durable memory when:

- the fact is stable
- it is likely useful later
- it is not sensitive without consent

### 10.3 Repo Memory

Persistent project-specific knowledge:

- common commands
- test entrypoints
- architecture summary
- coding conventions
- important directories

This can live in SQLite plus a checked-in optional repo file such as `.agent/project-memory.json`.

### 10.4 Memory Write Policy

Do not let the model freely mutate memory.
Use explicit memory tools with heuristics:

- confidence threshold
- deduplication
- TTL or review markers for uncertain facts

## 11. System Prompt Strategy

The system prompt should be modular rather than one huge string.

Recommended prompt composition:

- base identity
- collaboration style
- coding/editorial constraints
- tool usage rules
- skill loading rules
- goal governance rules
- memory rules
- final answer formatting rules

Represent prompt sections as separate versioned files:

```text
prompts/
├── base.md
├── coding.md
├── tools.md
├── skills.md
├── goals.md
├── memory.md
└── formatting.md
```

This makes prompt iteration testable and auditable.

## 12. Suggested Milestones

### Milestone 1: Minimal Useful Agent

Deliver:

- interactive CLI
- system prompt assembly
- read/search/edit tools
- shell command execution
- patch-based editing
- session summary
- simple plan tracking

This is enough to do real coding tasks in one repo.

### Milestone 2: Skill Framework

Deliver:

- `SKILL.md` discovery
- metadata indexing
- trigger logic
- skill body loading
- references/scripts resolution

### Milestone 3: Goal Mode + Memory

Deliver:

- persistent `/goal`
- SQLite state store
- session summaries
- durable memory and repo memory

### Milestone 4: Subagents

Deliver:

- bounded child sessions
- parallel task fan-out
- parent merge and verification flow

### Milestone 5: Advanced Tooling

Deliver:

- web/MCP tools
- browser automation
- richer artifact tools
- policy/approval framework

## 13. Testing Strategy

Test at three levels.

### 13.1 Unit Tests

- tool schema validation
- prompt assembly
- goal state transitions
- memory deduplication
- skill frontmatter parsing

### 13.2 Integration Tests

- single-turn code edit
- multi-turn refactor
- skill-triggered workflow
- blocked goal lifecycle
- subagent fan-out and merge

### 13.3 Eval Tasks

Create a small benchmark suite with tasks like:

- fix a failing test
- add a CLI flag
- refactor duplicated code
- explain a repo module
- follow a repo-local skill

Store:

- prompts
- expected artifacts
- pass/fail checks
- token and latency stats

## 14. Main Risks

- Context bloat causing low-quality planning
- Over-trusting model-written memory
- Unbounded subagents increasing cost and confusion
- Skills becoming long prompt dumps instead of targeted workflows
- Shell/file tools without strong policy boundaries
- Tight coupling between prompt wording and runtime behavior

## 15. Recommended First Build Order

If we implement this together, the most efficient order is:

1. bootstrap TypeScript monorepo or single-package CLI
2. implement tool registry plus file/shell tools
3. implement agent loop with structured tool calling
4. add patch-based editing and verification
5. add session summary and SQLite persistence
6. add `SKILL.md` discovery and loading
7. add `/goal` lifecycle
8. add subagent runtime
9. add durable memory
10. add advanced plugins and external tool protocols

## 16. Concrete Recommendation

Do not start by cloning all Codex surface area.
Start with a narrow but strong vertical slice:

- terminal CLI
- current-directory repo scope
- read/search/edit/run-command
- session summary
- basic skills
- basic `/goal`

Once that loop is solid, the rest can be layered on without redesigning the core.

## 17. What To Borrow From Superpowers

The skills under `/Users/zyb/.zcode/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/` are a strong reference implementation for process orchestration.

### 17.1 Treat Skills As Process Modules

One important pattern is that major behaviors are packaged as skills instead of being hardcoded into one giant system prompt.

Examples:

- `using-superpowers`: skill discovery and activation discipline
- `writing-plans`: turn specs into executable implementation plans
- `subagent-driven-development`: execute planned tasks with subagents and review loops
- `dispatching-parallel-agents`: parallelize truly independent investigations
- `verification-before-completion`: verify before declaring done

Implementation takeaway:

- keep the base system prompt small
- move reusable workflows into first-class skills
- let the runtime choose and activate workflow skills per turn

### 17.2 Add A Skill-Routing Gate Before Normal Reasoning

`using-superpowers` is strict about checking for relevant skills before doing anything else.

You do not need to copy that rule literally, but the architecture is good:

1. user message arrives
2. run skill router over metadata
3. activate 0..N process skills
4. only then continue with planning, tools, or clarifying questions

Recommended implementation:

- add a `preflight` stage to the runtime loop
- run `SkillRouter.match(message, repoState, goalState)`
- load only the chosen skill bodies
- expose activated skill instructions as a dedicated prompt section

### 17.3 Keep A Tool Mapping Layer Separate From Skill Content

The `codex-tools.md` mapping is a useful idea:
skills can describe workflow in platform-neutral terms, while the runtime maps them to actual tools.

For your agent, define a canonical internal tool vocabulary:

- `spawn_subagent`
- `wait_subagent`
- `update_plan`
- `read_file`
- `search_files`
- `run_shell`
- `apply_patch`

Then allow skills to reference either:

- canonical tool names, or
- aliases that are normalized by the runtime

This prevents skills from being tightly coupled to one host environment.

### 17.4 Model Subagents As Narrow, Fresh Sessions

`dispatching-parallel-agents` and `subagent-driven-development` both enforce isolated context for subagents.

This is worth preserving:

- subagents should not inherit the entire parent transcript
- each subagent gets a narrowly-scoped objective
- each subagent has a clear output contract
- parent agent validates and integrates results

Recommended result schema:

```ts
type SubagentResult = {
  status: "done" | "done_with_concerns" | "needs_context" | "blocked";
  summary: string;
  findings?: string[];
  proposedEdits?: string[];
  changedFiles?: string[];
  testResults?: string[];
  concerns?: string[];
};
```

### 17.5 Separate Planning From Execution

`writing-plans` treats plan generation as a distinct artifact, and `subagent-driven-development` consumes that artifact later.

That separation is valuable for your implementation too.

Recommended approach:

- planning mode produces a structured plan document plus machine-readable task list
- execution mode consumes that plan
- subagents receive extracted task text, not a vague instruction like “implement the plan”

Useful internal structures:

```ts
type ExecutionPlan = {
  id: string;
  goal: string;
  tasks: PlanTask[];
};

type PlanTask = {
  id: string;
  title: string;
  description: string;
  files: string[];
  verification: string[];
  dependencies: string[];
};
```

### 17.6 Review Loops Should Be Runtime Features, Not Just Prompt Advice

`subagent-driven-development` uses two review stages:

1. spec compliance
2. code quality

Even if you do not fully implement multi-role reviewer agents on day one, keep the runtime ready for review checkpoints.

Recommended progressive rollout:

- V1: parent agent self-review + test verification
- V2: optional review subagents
- V3: mandatory review policies for risky changes

### 17.7 Todo Tracking Maps Naturally To Plan State

The Superpowers skills use `TodoWrite` heavily.
In your agent, this should become first-class runtime state rather than only conversational text.

Recommended structure:

```ts
type TaskTrackerItem = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  source: "plan" | "skill" | "agent";
};
```

This can back:

- `/plan`
- `/goal show`
- TUI progress rendering
- resume after restart

### 17.8 Environment-Aware Skills Need Host Signals

The worktree-oriented skills check git state before deciding what to do.
That suggests a broader design rule:

- skills should not guess environment state
- runtime should expose environment facts as structured context

Examples of useful host facts:

- `projectRoot`
- `git.isRepo`
- `git.branch`
- `git.detachedHead`
- `git.inWorktree`
- `sandbox.networkAllowed`
- `sandbox.writeScope`
- `tools.available`

This lets skills stay declarative and portable.

## 18. Architecture Changes Recommended After Reviewing Superpowers

After reviewing these reference skills, the implementation plan should explicitly include the following modules:

### 18.1 Skill Router

Add:

- metadata index
- trigger scorer
- process-skill priority ordering
- activation log

### 18.2 Workflow Engine

Add a lightweight workflow layer above raw tool calling.
This engine should manage:

- active process skill
- task checklist
- review checkpoints
- handoff between planning and execution

### 18.3 Subagent Manager

Add:

- child session creation
- scoped context packaging
- lifecycle states
- parallel dispatch coordinator
- merge conflict detection

### 18.4 Host Capability Adapter

Add a translation layer between abstract workflow instructions and concrete available tools.

For example:

- abstract `track_tasks` -> local `update_plan`
- abstract `dispatch_agent` -> local subagent runner
- abstract `run_command` -> shell executor

This will make your skill ecosystem portable.

## 19. Updated Build Order

Based on the Superpowers reference, a better implementation order is:

1. CLI shell + session persistence
2. tool registry + capability adapter
3. core runtime loop with `preflight` skill routing
4. file/shell/edit tools
5. plan tracker and session summary
6. `SKILL.md` discovery, activation, and reference loading
7. structured plan artifact generation
8. `/goal` governance
9. subagent manager with narrow context packaging
10. review workflow hooks
11. durable memory
12. advanced external tools and plugins
