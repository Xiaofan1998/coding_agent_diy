# 向 pi-mono 风格 Agent Loop 迁移说明

## 1. 背景

当前 `code-agent-0617` 已具备：

- 多轮 `chat` / `run` CLI
- 工具调用与治理
- `SKILL.md` 发现、读取、按需激活
- goal / plan / review / workflow / trace / memory 持久化
- subagent 执行

但它与 `pi-mono` 的底层 agent loop 仍有明显差异。

用户期望的形态是：

1. 用户提出任务
2. agent 进入持续循环
3. 循环内不断：
   - 决策下一步
   - 调工具 / 读 skill / 调脚本
   - 观察结果
   - 根据结果继续下一轮决策
4. 直到 LLM 明确认为任务结束，才输出最终答复

也就是说，目标不是“单轮函数调用里顺便调用几个工具”，而是“有独立生命周期的 agent loop 框架”。

## 2. 对照 pi-mono 的关键参考

可参考：

- `pi-mono/packages/agent/src/agent-loop.ts`
- `pi-mono/packages/mom/src/agent.ts`

它们体现了几个核心能力：

- 独立的 `agentLoop()` / `agentLoopContinue()`
- 结构化消息模型，而不是纯字符串 turn
- 工具执行生命周期事件
- `steering messages` 与 `follow-up messages`
- context transform / compaction
- skills 和 memory 作为 loop 的一等资源

## 3. 当前仓库已经完成的基础改造

截至当前版本，`code-agent-0617` 已做的与本迁移直接相关的工作有：

### 3.1 skills 跨 workspace 发现

文件：`packages/skills/discovery.js`

已支持：

- 当前项目内置 skills
- 当前项目 repo-local skills
- 用户全局 skills
- `workspaceRoots` 下的：
  - `.agents/skills/`
  - `skills/`

这使得 `geometry_videogen/.agents/skills` 已能被当前 agent 发现和列出。

### 3.2 skills 请求的 prompt 约束增强

文件：`prompts/skills.md`

已补充：

- 当用户明确问 skills / capabilities / skill 目录时，优先走 `list_skills` / `read_skill`
- 避免默认落回 `list_files`

### 3.3 模型-工具循环从 runtime 中抽离

文件：

- `packages/core/agent-loop.js`
- `packages/core/runtime.js`

已完成：

- 将原本埋在 `runtime.runTurn()` 中的模型-工具循环抽成独立 `runAgentLoop()`
- `runtime` 现在主要负责：
  - 加载 session / goal / memory / repo context / skills
  - 组装 prompt
  - 调用 loop
  - 收尾持久化

这一步是后续继续向 `pi-mono` 演进的前提。

### 3.4 非 continuation provider 的结构化工具回灌

文件：`packages/core/agent-loop.js`

已支持：

- 对 `supportsResponseContinuation = false` 的 provider
- 用结构化 `tool_use` / `tool_result` 回灌模型

这比“把工具结果拼成普通字符串”更接近 `pi-mono` 的执行语义。

### 3.5 steering / follow-up 最小骨架

文件：

- `packages/core/agent-loop.js`
- `packages/core/runtime.js`

已支持：

- `getSteeringMessages()`
- `getFollowUpMessages()`
- runtime 侧：
  - `enqueueSteeringMessage()`
  - `enqueueFollowUpMessage()`
  - `takeSteeringMessages()`
  - `takeFollowUpMessages()`

这意味着 loop 已经具备“当前回合结束后自动注入后续消息再继续”的能力骨架。

## 4. 仍然缺失的核心能力

下面这些，才是当前仓库与 `pi-mono` 真正的差距。

### 4.1 缺少结构化消息模型

当前主要仍然是：

- `userMessage`
- `response`

这种字符串级 turn 存储。

问题：

- 不利于工具结果继续推理
- 不利于精细 compaction
- 不利于事件流式展示
- 不利于 loop 中途继续执行

建议目标：

定义统一消息模型，例如：

- `user`
- `assistant`
- `tool_call`
- `tool_result`
- `system_note`
- `compaction`
- `branch_summary`

然后逐步让：

- runtime
- state-store
- trace
- dashboard
- session show/history

都消费这个结构化模型。

### 4.2 缺少事件驱动 loop

当前 `runAgentLoop()` 还是“返回最终结果的函数”，还不是事件流。

而 `pi-mono` 的关键优势之一是 loop 生命周期事件非常完整。

建议引入事件类型：

- `agent_start`
- `turn_start`
- `message_start`
- `message_update`
- `message_end`
- `tool_execution_start`
- `tool_execution_update`
- `tool_execution_end`
- `turn_end`
- `loop_messages_injected`
- `auto_compaction_start`
- `auto_compaction_end`
- `agent_end`

价值：

- chat UI 更容易展示过程
- monitor / harness 可实时观察
- 审计与 trace 更准确
- 后续可接桌面端 / web dashboard

### 4.3 缺少 context transform / compaction

这是目前最重要但尚未落地的一块。

现在虽然有：

- `saveSummary`
- `buildWorkingMemory`
- repo context budget

但没有“loop 内自动压缩上下文再继续”的能力。

建议新增：

- `packages/core/context-transform.js`
- 或 `packages/core/compaction.js`

功能包括：

1. 估算当前上下文大小
2. 当超过阈值时：
   - 保留最近 N 条结构化消息
   - 把旧消息压缩成 summary / compaction entry
   - 保留关键 tool_result / file edit / approval / blocker 信息
3. 下轮继续推理时，用：
   - compaction summary
   - recent messages
   - repo snapshot
   - active skills
   替代全量历史

### 4.4 缺少“skill 执行链”能力

当前已能：

- 发现 skill
- 匹配 skill
- 读取 `SKILL.md`

但还没有把“读 skill → 继续读 reference/script → 实际调用脚本 → 再分析结果”做成 loop 中稳定的一等行为。

建议新增：

- `packages/skills/execution.js`

职责：

1. 解析 `SKILL.md` 中显式引用
2. 识别 `references/` / `scripts/` / `assets/`
3. 为模型提供更强的 skill-aware next action
4. 对脚本型 skill 提供安全包装调用

目标不是让 skill 神秘化，而是让 skill 真正成为 loop 里的“策略资源”。

### 4.5 缺少 chat 层对 steering / follow-up 的接入

现在 runtime 已经有队列接口，但 CLI 还没真正用起来。

建议改造 `apps/cli/index.js`：

1. 交互式 chat 模式中，允许：
   - 当前 agent 正在执行时插入 steering
   - 当前 agent 准备结束时插入 follow-up
2. `chat-monitor.js` 支持：
   - 等待 tool event
   - 等待 turn_end
   - 等待 agent_end
3. 为 future UI / dashboard 预留事件订阅接口

### 4.6 缺少“工具输出标准化协议”

参考 `agent-harness-construction` skill，理想工具输出应统一具备：

- `status`
- `summary`
- `next_actions`
- `artifacts`

现在各工具输出风格还不统一。

建议逐步规范：

- `file-tools`
- `shell-tool`
- `web-tools`
- `state-tools`

这样 loop 才更容易稳定继续推理，而不是因为工具输出风格不一导致模型只能“猜”。

## 5. 推荐的迁移顺序

### Phase 1：Loop 基础设施

目标：把 loop 从“逻辑块”升级成真正的框架。

建议任务：

1. 给 `runAgentLoop()` 增加事件流接口
2. 把工具执行事件显式化
3. 明确 `agentLoop()` / `agentLoopContinue()` 区分
4. chat / run 改为消费 loop 事件

### Phase 2：结构化消息模型

目标：让会话和工具结果可以被精确复用。

建议任务：

1. 定义统一消息类型
2. 改造 state-store 的 session 存储
3. 改造 `session show` / `session history`
4. 改造 trace 和 dashboard 对消息结构的读取

### Phase 3：Compaction

目标：解决长任务上下文膨胀。

建议任务：

1. 新增 context transform
2. 建立 compaction entry
3. 定义保留策略
4. 在 smoke 中增加超长上下文回归测试

### Phase 4：Skill 执行链

目标：让 skill 不只是“被发现”，而是真能驱动后续执行。

建议任务：

1. 新增 skill execution helper
2. 自动引用 `references/`
3. 安全运行 `scripts/`
4. 给模型更强的 skill-first first-tool routing

### Phase 5：Loop 驱动的 chat / monitor / UI

目标：让上层交互真正享受 loop 架构收益。

建议任务：

1. chat 模式支持插入 steering / follow-up
2. chat-monitor 监听 loop 事件
3. dashboard 展示 loop 事件时间线
4. 对接 future web/desktop UI

## 6. 当前可以确认的结论

### 已经被验证的事实

当前仓库已经可以证明：

1. `geometry_videogen` 下的 skills 已能被系统发现
2. 对“请梳理 geometry_videogen 下的 skills”这类请求，当前 agent 已不再只停在 `list_files`
3. agent loop 已被抽成独立模块
4. loop 已具备 follow-up 继续执行的最小能力

### 还不能声称已经完成的事

当前还不能说“已经完整复刻 pi-mono 风格 loop”，因为还缺：

- 事件驱动 loop
- 结构化消息持久化
- 自动 compaction
- skill execution chain
- chat 层的 steering/follow-up 真正交互接入

## 7. 直接下一步建议

如果继续开发，最值得优先做的是：

1. 给 `packages/core/agent-loop.js` 增加事件流
2. 让 `apps/cli/index.js` 基于事件流渲染 chat 过程
3. 开始把 session 数据改为结构化消息

这是最接近 `pi-mono` 架构跃迁的一步。
