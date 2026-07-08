# 类 Codex Coding Agent 实现规划

## 1. 目标

构建一个面向终端的 coding agent，它能够：

- 以启动时所在目录作为默认项目根目录
- 在交互式 CLI 中接受用户自然语言指令
- 读取项目文件、分析任务、调用工具并修改代码
- 在合适时加载并执行 `SKILL.md` 风格的工作流
- 在边界清晰的情况下把子任务下发给 subagent
- 支持类似 `/goal` 的目标驱动执行与治理
- 在多轮对话中维护上下文和记忆，同时避免上下文膨胀

这份文档关注的是“如何实现”，而不是声称复刻 Codex 的真实内部源码。

## 2. 设计原则

建议以这些原则为基线：

- 本地优先：默认所有文件操作都限定在当前工作目录
- 工具优先：优先通过显式工具调用完成能力，而不是让模型“想象自己能做”
- 渐进加载：只加载当前任务所需的最小上下文
- 安全编辑：先检查、再修改，优先用 patch 而不是整文件覆盖
- 有边界的自治：尽量端到端完成任务，但对高风险动作设置护栏
- 编排可控：由 runtime 决定哪些工具可用、何时可用，而不是完全交给模型
- 全程可追踪：记录每一步动作、工具调用、文件修改和验证结果

## 3. 高层架构

推荐的代码组织方式：

```text
code-agent/
├── apps/
│   └── cli/
├── packages/
│   ├── core/              # agent 主循环、策略、状态机
│   ├── llm/               # 模型适配层与 prompt 组装
│   ├── tools/             # 工具注册与执行
│   ├── skills/            # skill 发现、索引、加载
│   ├── memory/            # session memory 和长期记忆
│   ├── subagents/         # subagent 调度与结果合并
│   ├── context/           # repo 索引与上下文预算
│   ├── goals/             # /goal 治理逻辑
│   ├── edits/             # diff、patch、验证
│   └── shared/
└── docs/
```

推荐技术栈：

- 语言：TypeScript
- 运行时：Node.js
- CLI：`commander` 或 `cac`
- LLM 接口：Responses API 或其他适合 agent/tool calling 的接口
- 存储：
  - SQLite：保存 session、goal、memory、tool trace
  - 本地文件：保存 skills、prompt 模板、配置
- 搜索与索引：
  - `ripgrep`：做文件发现和文本搜索
  - 向量检索：可作为后续增强能力

## 4. Runtime 主循环

每一轮用户交互的核心流程：

1. 从终端读取用户输入
2. 加载 session 状态、项目根目录、active goal 和 memory 摘要
3. 获取当前可用的工具、skills 和策略约束
4. 组装 system prompt 和工作上下文
5. 调用模型决定下一步动作
6. 如果模型请求工具，则通过 orchestrator 执行
7. 将工具结果追加到工作轨迹中
8. 重复上述过程，直到模型输出最终用户答复
9. 持久化 summary、memory 更新、tool trace、文件修改结果

这里建议实现成一个小型状态机，而不是松散的递归式循环。

推荐状态：

- `idle`
- `planning`
- `tool_calling`
- `awaiting_tool_result`
- `subagent_running`
- `verifying`
- `responding`
- `blocked`

## 5. 工具系统

### 5.1 工具类别

第一版先做一组“少而强”的工具：

- 文件工具
  - 列出文件
  - 读取文件
  - 搜索文本
  - 应用 patch
  - 写入新文件
- Shell 工具
  - 执行命令
  - 流式读取 stdout/stderr
- Git 工具
  - `status`
  - `diff`
  - `log`
- 计划/状态工具
  - `update_plan`
  - `create_goal`
  - `update_goal`
- 记忆工具
  - 保存记忆
  - 检索记忆
- Skill 工具
  - 列出 skills
  - 读取 skill
- Subagent 工具
  - 创建 subagent
  - 等待并收集结果

后续可以再扩展：

- Web / Browser 工具
- 文档 / 表格 / PDF 工具
- 兼容 MCP 的外部工具

### 5.2 工具契约

每个工具建议统一暴露：

- `name`
- `description`
- `inputSchema`
- `riskLevel`
- `timeoutMs`
- `requiresConfirmation`
- `execute()`

重要实现点：
模型不能直接调用宿主代码。它只能发出结构化的工具请求，再由 orchestrator 负责校验并执行。

### 5.3 工具治理与安全

建议定义几级策略：

- `safe`：只读，无需确认
- `caution`：工作区写入、常规 shell 命令
- `restricted`：网络访问、破坏性 shell、越出项目根目录的写入
- `forbidden`：直接禁止

无论模型怎么请求，最终都由 runtime 强制执行这些策略。

## 6. Skill 系统

### 6.1 Skill 格式

建议采用与 Codex / Superpowers 类似的渐进加载模式：

- skill 元数据来自 `SKILL.md` frontmatter
- 全局只索引元数据
- 当 skill 被触发时再加载完整 `SKILL.md`
- `references/`、`scripts/`、`assets/` 只在确有需要时继续加载

示例目录：

```text
skills/
└── react-refactor/
    ├── SKILL.md
    ├── references/
    ├── scripts/
    └── assets/
```

### 6.2 Skill 触发

建议做两阶段触发：

1. 轻量路由：
   - 用户消息
   - repo 信号
   - 当前 goal
2. 模型确认：
   - “使用 skill X，因为当前任务符合 Y”

这样可以避免一次性把太多 skill 全塞进上下文。

### 6.3 Skill 加载规则

建议明确以下规则：

- 使用 skill 前先完整读取 `SKILL.md`
- 相对路径一律从 skill 所在目录解析
- 只加载与当前任务直接相关的 reference
- 能运行脚本时优先运行脚本，而不是让模型重复生成大段样板内容

### 6.4 Skill 来源

至少支持三类来源：

- 内置系统 skills
- 用户级全局 skills
- 仓库本地 skills

优先级：

1. repo-local
2. user-global
3. built-in

## 7. Subagent 下发

### 7.1 为什么需要 Subagent

subagent 适合处理边界清晰、可并行、可隔离的工作，例如：

- 在多个目录里独立检索代码
- 分析不同失败测试的根因
- 并行探索多种可选实现方案
- 用独立 agent 验证某个 skill 在真实任务里的效果

### 7.2 下发规则

一次 subagent 请求应包含：

- objective
- scope
- allowed tools
- output contract
- context budget
- timeout

不要默认把完整父对话传给 subagent。
只传：

- 明确任务
- 相关文件或摘要
- 可用策略
- 期望交付物

### 7.3 结果合并

父 agent 仍然是最终决策者。
subagent 返回结构化结果：

- summary
- findings
- proposed edits
- uncertainty
- artifacts

父 agent 的处理流程：

1. 校验 subagent 输出
2. 视情况重新检查其修改涉及的文件
3. 采纳或拒绝其建议
4. 汇总成最终答复

### 7.4 第一阶段实现建议

第一版可以把 subagent 实现为同一 runtime 上的短生命周期 child session，并具备：

- 独立的短上下文
- 精简过的工具集
- 更严格的 token 预算

## 8. Goal 模式治理

`/goal` 应当是一个显式、持久化的执行模式，而不是单纯靠 prompt 风格模拟。

### 8.1 Goal 对象

建议存储：

- `id`
- `objective`
- `status`（`active`、`complete`、`blocked`）
- `createdAt`
- `updatedAt`
- `tokenBudget`（可选）
- `tokenUsed`
- `turnCount`
- `blockCount`
- `completionCriteria`

### 8.2 Goal 语义

规则建议如下：

- goal 只在用户显式要求时创建
- goal 跨轮次保持 active
- agent 在后续决策中持续对齐到该 goal
- 标记完成必须有明确证据
- 只有在重复无法推进时才允许进入 blocked

### 8.3 Goal 治理逻辑

推荐 blocked 规则：

- 如果同一个阻塞条件连续出现 3 个 goal turn，则标记为 `blocked`
- 如果之后用户恢复该 goal，则重新开始 blocked 审计

这能让 goal 状态转换由 runtime 接管，而不是完全交给模型主观判断。

### 8.4 Goal 交互界面

CLI 命令可以设计为：

- `/goal create <text>`
- `/goal show`
- `/goal complete`
- `/goal cancel`
- `/goal resume`

## 9. 上下文管理

上下文管理是这个系统的核心工程问题。

### 9.1 上下文分层

建议按层组装 prompt：

1. System prompt
2. Runtime policy 和工具 schema
3. Active goal 摘要
4. Session summary
5. Relevant memories
6. Relevant repo context
7. Relevant skills
8. Current turn messages
9. Recent tool results

### 9.2 Repo 上下文策略

不要把文件内容大段直接塞进 prompt。
建议采用分阶段检索：

- 阶段 A：通过 `rg`、git diff、package manifest 等发现候选文件
- 阶段 B：只读取高相关文件
- 阶段 C：把文件内容压缩成工作摘要

文件排序信号可以包括：

- 用户提示里直接提到的文件名
- 最近修改的文件
- import / 调用关系邻近性
- 测试失败信息
- skill 引用到的文件

### 9.3 Working Memory Window

维护一个短生命周期的“工作摘要”，而不是无限堆叠原始 transcript：

- 当前任务理解
- 已检查文件
- 当前假设
- 未决问题
- 待完成的工具结果
- 已选择的计划

这个摘要每轮可以重新生成，用来替代冗长的原始历史。

### 9.4 上下文预算

可以预留一套默认预算：

- 20%：system + policy + tools
- 20%：goal + memory + session summary
- 40%：repo / skill / task context
- 20%：为模型响应和工具决策预留空间

这些预算建议做成可配置项。

## 10. 记忆管理

建议把记忆拆成三层。

### 10.1 Session Memory

当前会话内的短期记忆：

- 最近的决策
- 当前 repo 的临时假设
- 临时命名或别名
- 计划摘要

### 10.2 Durable User Memory

跨会话的用户长期偏好，只存稳定、低频但高价值的信息：

- 用户偏好的语言/框架
- 常用代码风格
- 输出格式偏好
- 经常重复的工作方式

只有在满足以下条件时才写入长期记忆：

- 事实稳定
- 未来大概率还有用
- 不涉及敏感信息，或已获得用户许可

### 10.3 Repo Memory

面向项目的持久化知识：

- 常用命令
- 测试入口
- 架构摘要
- 代码规范
- 重要目录

可以存在 SQLite 中，也可以选择同步到仓库内的 `.agent/project-memory.json`。

### 10.4 记忆写入策略

不要让模型自由改写 memory。
建议使用显式 memory tools，并配套规则：

- 置信度阈值
- 去重
- 对不确定事实添加 TTL 或 review 标记

## 11. System Prompt 策略

system prompt 建议采用模块化拼装，而不是一整段大字符串。

推荐拆分为：

- base identity
- collaboration style
- coding / 编辑约束
- tool 使用规则
- skill 加载规则
- goal 治理规则
- memory 规则
- final answer 格式规则

建议目录：

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

这样后续做 prompt 迭代、A/B 测试和审计都会更方便。

## 12. 建议里程碑

### 里程碑 1：最小可用 Agent

交付：

- 交互式 CLI
- system prompt 组装
- 读 / 搜 / 改 工具
- shell 命令执行
- patch 风格编辑
- session summary
- 基础 plan tracking

做到这一步，就已经可以在真实 repo 中完成不少 coding 任务。

### 里程碑 2：Skill 框架

交付：

- `SKILL.md` 发现
- metadata 索引
- trigger logic
- skill body 加载
- references / scripts 解析

### 里程碑 3：Goal + Memory

交付：

- 持久化 `/goal`
- SQLite 状态存储
- session summaries
- durable memory 和 repo memory

### 里程碑 4：Subagents

交付：

- 有边界的 child sessions
- 并行任务分发
- 父 agent 合并与验证流程

### 里程碑 5：高级工具

交付：

- web / MCP 工具
- browser automation
- 更丰富的 artifact 工具
- 更完整的 policy / approval 框架

## 13. 测试策略

建议分三层测试。

### 13.1 单元测试

- 工具 schema 校验
- prompt 组装
- goal 状态流转
- memory 去重
- skill frontmatter 解析

### 13.2 集成测试

- 单轮代码修改
- 多轮重构
- skill 触发工作流
- blocked goal 生命周期
- subagent 并行与结果合并

### 13.3 Eval 任务集

准备一个小型 benchmark，任务例如：

- 修复一个 failing test
- 给 CLI 新增一个 flag
- 重构重复代码
- 解释某个 repo 模块
- 按 repo-local skill 执行任务

记录：

- prompts
- 期望产物
- pass/fail 校验
- token / latency 统计

## 14. 主要风险

- 上下文膨胀，导致规划质量下降
- 过度相信模型写入的 memory
- subagent 无边界扩散，带来成本和混乱
- skill 退化成“大段 prompt 倾倒”
- shell / file 工具没有足够强的策略约束
- 运行时行为与 prompt 表述耦合过深

## 15. 推荐的首版实现顺序

如果我们一起落地，建议先按这个顺序实现：

1. 初始化 TypeScript monorepo 或单包 CLI
2. 实现 tool registry 和基础文件 / shell 工具
3. 实现 agent loop 和结构化 tool calling
4. 实现 patch 编辑和验证
5. 加入 session summary 和 SQLite 持久化
6. 加入 `SKILL.md` 发现与加载
7. 加入 `/goal` 生命周期
8. 加入 subagent runtime
9. 加入 durable memory
10. 加入外部工具协议和高级插件能力

## 16. 具体建议

不要一开始就试图覆盖 Codex 的全部表面能力。
更好的办法是先做一条稳定的纵向闭环：

- 终端 CLI
- 当前目录作为项目作用域
- 读 / 搜 / 改 / 执行命令
- session summary
- 基础 skills
- 基础 `/goal`

只要这条主链路稳定，后面的能力都可以继续叠加，而无需推翻重做。

## 17. 从 Superpowers 借鉴什么

`/Users/zyb/.zcode/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/` 这套技能集合，非常适合作为“流程编排层”的参考。

### 17.1 把 Skill 当成流程模块

一个关键点是：主要行为模式不是塞进一个巨大 system prompt，而是拆成 skill。

典型例子：

- `using-superpowers`：skill 发现与启用纪律
- `writing-plans`：把 spec 变成可执行实现计划
- `subagent-driven-development`：用 subagent 执行计划并经过 review loop
- `dispatching-parallel-agents`：并行处理真正独立的问题域
- `verification-before-completion`：在声明完成前强制验证

对你的实现启发是：

- 基础 system prompt 保持小而稳
- 把可复用工作流沉淀为一等 skill
- 每轮由 runtime 决定激活哪些流程 skill

### 17.2 在普通推理前增加 Skill Routing Gate

`using-superpowers` 的核心思想是：先判 skill 是否适用，再做其他事情。

你不一定要照搬它那种极端严格规则，但架构思路很值得用：

1. 收到用户消息
2. 对 skill metadata 做路由判断
3. 激活 0 到 N 个 process skills
4. 然后才进入规划、工具调用或澄清

建议落地方式：

- 在 runtime loop 里增加 `preflight` 阶段
- 执行 `SkillRouter.match(message, repoState, goalState)`
- 只加载命中的 skill body
- 把激活 skill 的指令单独放进 prompt 的一个 section

### 17.3 把 Tool Mapping 层独立出来

`codex-tools.md` 给了一个很好的思路：
skill 里描述的是平台无关的工作流，而具体调用什么工具由 runtime 映射。

建议你在内部先定义一套规范化工具名：

- `spawn_subagent`
- `wait_subagent`
- `update_plan`
- `read_file`
- `search_files`
- `run_shell`
- `apply_patch`

然后让 skill 支持引用：

- 规范化工具名
- 或被 runtime 归一化后的别名

这样 skill 不会和某个单一宿主环境强耦合。

### 17.4 把 Subagent 建模成窄上下文的新会话

`dispatching-parallel-agents` 和 `subagent-driven-development` 都强调一件事：
subagent 必须使用隔离上下文。

这个约束非常值得保留：

- subagent 不继承完整父 transcript
- 每个 subagent 只有一个窄而清晰的 objective
- 每个 subagent 都有明确输出契约
- 父 agent 负责验证和整合

建议返回结构：

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

### 17.5 把“规划”和“执行”分开

`writing-plans` 与 `subagent-driven-development` 之间的分离很有价值：
计划先作为工件被产出，再交给执行流程消费。

对你的 agent 也建议这样做：

- planning mode 产出结构化计划文档和机器可读任务列表
- execution mode 消费这份计划
- subagent 收到的是“抽取后的任务全文”，而不是模糊的“去实现一下这个计划”

建议内部结构：

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

### 17.6 Review Loop 应当是 Runtime 能力，而不只是 Prompt 提示

`subagent-driven-development` 设计了两道 review：

1. spec compliance
2. code quality

即使第一版还不做多 reviewer agent，也建议把 review checkpoint 留在 runtime 设计里。

推荐演进路径：

- V1：父 agent 自检 + 测试验证
- V2：可选 reviewer subagent
- V3：对高风险修改强制走 review policy

### 17.7 Todo Tracking 天然适合映射到 Plan State

Superpowers 大量使用 `TodoWrite`。
在你的 agent 里，这不应只是一段对话文本，而应该成为一等状态对象。

建议结构：

```ts
type TaskTrackerItem = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  source: "plan" | "skill" | "agent";
};
```

它可以直接支撑：

- `/plan`
- `/goal show`
- TUI 进度显示
- 重启后的恢复执行

### 17.8 环境感知型 Skill 需要宿主信号

像 worktree 相关 skill，会先检查 git 环境再决定动作。
这说明一个更普遍的设计规则：

- skill 不应靠猜测判断环境
- runtime 应显式暴露结构化环境事实

例如：

- `projectRoot`
- `git.isRepo`
- `git.branch`
- `git.detachedHead`
- `git.inWorktree`
- `sandbox.networkAllowed`
- `sandbox.writeScope`
- `tools.available`

这样 skill 才能保持声明式、可移植。

## 18. 看完 Superpowers 后，建议新增的模块

结合这套参考实现，架构里建议明确增加以下模块。

### 18.1 Skill Router

增加：

- metadata index
- trigger scorer
- process-skill priority ordering
- activation log

### 18.2 Workflow Engine

在原始 tool calling 之上，再加一层轻量 workflow 层，负责：

- 当前激活的 process skill
- 任务 checklist
- review checkpoint
- 规划到执行的切换

### 18.3 Subagent Manager

增加：

- child session 创建
- 范围受限的上下文打包
- 生命周期状态管理
- 并行调度协调
- merge 冲突检测

### 18.4 Host Capability Adapter

增加一层“抽象动作 -> 具体工具”的翻译：

- 抽象 `track_tasks` -> 本地 `update_plan`
- 抽象 `dispatch_agent` -> 本地 subagent runner
- 抽象 `run_command` -> shell executor

这会让 skill 生态更可移植。

## 19. 更新后的实现顺序

结合 Superpowers 的参考，我更推荐按这个顺序落地：

1. CLI shell + session persistence
2. tool registry + capability adapter
3. 带 `preflight` skill routing 的 core runtime loop
4. 文件 / shell / 编辑工具
5. 计划追踪和 session summary
6. `SKILL.md` 发现、激活和 reference 加载
7. 结构化 plan artifact 生成
8. `/goal` 治理
9. 带窄上下文打包的 subagent manager
10. review workflow hooks
11. durable memory
12. 高级外部工具和插件能力

## 20. 一次用户指令的真实执行链

如果你的目标是做一个“能在终端里真正工作”的 coding agent，那么一次 turn 建议严格走下面这条链路：

1. 接收用户输入
2. 读取 session 状态、active goal、plan、pending approval、memory summary
3. 读取当前工作区快照：
   - `cwd`
   - git 状态
   - 最近修改文件
   - 可用工具
   - 可用 skills
4. 进入 `preflight`：
   - 识别是否命中 process skill
   - 判断是否需要进入 planning / execution / review / goal continuation
5. 组装 prompt：
   - base identity
   - runtime policy
   - active skill instructions
   - active goal
   - 当前任务上下文
   - 最近必要工具结果
6. 调用模型，拿到：
   - 直接答复
   - 工具调用
   - 更新计划
   - 请求 subagent
   - 请求 goal 状态变更
7. 由 runtime 校验请求是否合法
8. 执行工具或调度 subagent
9. 将结果回灌到 working trace
10. 如有必要继续循环，直到得到最终答复
11. 持久化：
   - turn transcript
   - tool trace
   - plan state
   - goal state
   - memory update
   - artifact index
12. 输出终端答复

这里最重要的不是“模型多聪明”，而是 runtime 要把每一步都接稳。Codex-like agent 的稳定性，很大程度来自这条执行链的工程约束。

## 21. 建议落地的核心模块

如果按工程可维护性来拆，建议至少显式做出下面这些模块。

### 21.1 `SessionManager`

负责：

- session 创建与恢复
- turn 持久化
- session summary 压缩
- 当前项目根目录绑定

建议数据：

```ts
type AgentSession = {
  id: string;
  projectRoot: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  activeGoalId?: string;
};
```

### 21.2 `ContextBuilder`

负责：

- 文件候选集发现
- 相关文件读取
- skill 上下文拼装
- token 预算分配
- transcript 压缩

建议输出：

```ts
type BuiltContext = {
  systemSections: string[];
  repoSummary: string;
  selectedFiles: Array<{ path: string; reason: string; excerpt: string }>;
  activeSkills: string[];
  memorySummary: string;
  budgetReport: {
    promptTokensEstimated: number;
    remainingForResponse: number;
  };
};
```

### 21.3 `ToolRegistry` + `ToolPolicy`

负责：

- 工具注册
- schema 校验
- 风险等级判断
- 是否允许当前 turn 调用
- approval gate

建议把“工具是否存在”和“工具当前是否允许调用”分开：

- registry 解决“能不能”
- policy 解决“此刻可不可以”

### 21.4 `SkillRouter`

负责：

- skill metadata 索引
- 触发评分
- process skill 优先级排序
- skill 激活日志

建议输出：

```ts
type SkillActivation = {
  skillName: string;
  reason: string;
  priority: number;
  referencesToLoad: string[];
};
```

### 21.5 `PlanManager`

负责：

- 结构化计划创建
- 任务状态流转
- plan artifact 导出
- 与 goal / review / workflow 联动

建议状态：

- `pending`
- `in_progress`
- `completed`
- `blocked`
- `cancelled`

### 21.6 `SubagentManager`

负责：

- 生成子任务 brief
- 限定上下文和工具边界
- 调度单个或并行 subagent
- 回收结果
- 冲突检测和合并

建议不要让 subagent 直接继承父 agent 的完整对话。
父 agent 传给 subagent 的应该是：

- objective
- scope
- required files
- constraints
- output contract
- timeout

### 21.7 `GoalGovernor`

负责：

- `/goal` 生命周期
- blocked 审计
- token/turn budget 追踪
- approval / review hold 联动

这部分一定要由 runtime 做硬逻辑，而不是只写在 prompt 里期待模型遵守。

### 21.8 `MemoryManager`

负责：

- session memory 写入与压缩
- durable user memory 筛选
- repo memory 累积
- 记忆检索
- TTL / 去重 / 置信度

### 21.9 `ArtifactManager`

负责导出和索引：

- plans
- reviews
- approvals
- traces
- workflow snapshots
- machine-state exports

如果后面你要做 UI、dashboard、回放、审计，这一层会非常关键。

## 22. System Prompt 的推荐拼装方式

不要维护一个超长总 prompt。更推荐做成“可组合 prompt 包”。

建议顺序：

1. `base.md`
   - 身份
   - 合作风格
   - 默认行为
2. `coding.md`
   - 搜索、读取、修改代码规则
   - 先读后改
   - patch 优先
3. `tools.md`
   - 只能通过结构化工具请求调用能力
   - 不可伪造工具结果
4. `skills.md`
   - 何时检查 skill
   - 如何读取 `SKILL.md`
   - 如何做 progressive disclosure
5. `goals.md`
   - `/goal` 生命周期
   - blocked 条件
   - 完成条件
6. `memory.md`
   - 什么该记
   - 什么不该记
   - 何时写入长期记忆
7. `formatting.md`
   - CLI 输出风格
   - 中间进度提示
   - 最终答复格式
8. `task overlay`
   - 当前激活的 skill
   - 当前 goal
   - 当前 plan
   - 当前审批/治理状态

建议内部实现：

```ts
type PromptAssembly = {
  system: string;
  sections: Array<{
    name: string;
    priority: number;
    content: string;
  }>;
};
```

这样后面做 prompt 试验时，只需要替换某个 section，而不是重写整份 system prompt。

## 23. `/goal` 模式建议做成“治理状态机”

很多 agent 都会把 `/goal` 做成一句 prompt 指令，但这通常不够稳。更建议把它做成一个治理状态机。

### 23.1 建议状态

- `active`
- `complete`
- `blocked`

### 23.2 建议派生信号

- `hasOpenApprovals`
- `hasFailingReview`
- `hasBlockedPlanItems`
- `budgetExceeded`
- `waitingOnUser`
- `waitingOnSubagent`

### 23.3 建议治理规则

- 有 open approval 时：
  - 禁止继续执行高风险工具
  - subagent 只能拿只读工具，或直接暂停派发
- 有关键 review 未通过时：
  - goal 保持 `active`
  - workflow 进入 `governance_hold`
- 连续 3 个 turn 遇到同一阻塞原因：
  - 标记 `blocked`
- 用户恢复 goal 后：
  - 重新开始 blocked 审计

### 23.4 对用户可见的 `/goal` 命令

建议 CLI 至少支持：

- `/goal create <objective>`
- `/goal show`
- `/goal complete`
- `/goal cancel`
- `/goal resume`
- `/goal artifacts`

## 24. 记忆管理建议做成“三层 + 一条写入闸门”

### 24.1 三层记忆

- Session Memory
  - 当前会话短期记忆
  - 当前任务假设、已读文件、计划摘要
- Repo Memory
  - 当前项目稳定知识
  - 启动命令、测试入口、目录约定、架构摘要
- User Durable Memory
  - 用户稳定偏好
  - 代码风格、输出语言、常见工作方式

### 24.2 写入闸门

建议每次写记忆都经过统一判断：

1. 这条信息是不是稳定事实
2. 未来是否高概率复用
3. 是否不敏感
4. 是否值得占据长期存储
5. 是否已经存在近似记忆

如果任何一项不满足，就只写 session summary，不写 durable memory。

## 25. MVP 到增强版的阶段计划

### Phase 1：最小工作闭环

目标：先让 agent 真能在一个本地 repo 里做事。

交付：

- 终端 CLI
- 当前目录自动作为 `projectRoot`
- 文件读取、搜索、patch 写入
- shell 执行
- 基础 tool calling loop
- 简单 session 持久化

验收标准：

- 能读代码
- 能解释代码
- 能修改 1 到 3 个文件
- 能运行测试并根据结果继续修复

### Phase 2：计划与技能

交付：

- `update_plan`
- `SKILL.md` 发现和激活
- process skill 的 preflight routing
- reference/script 渐进加载

验收标准：

- 用户说“先规划一下”时，agent 能生成结构化 plan
- 用户任务命中 skill 时，agent 会先激活 skill 再行动

### Phase 3：目标治理与记忆

交付：

- `/goal` 生命周期
- goal governor
- session summary 压缩
- repo memory / user memory

验收标准：

- goal 可跨轮次保持
- 阻塞会被正确记录
- 重启 agent 后可恢复主要状态

### Phase 4：Subagent 与 Review Loop

交付：

- child session / subagent runtime
- brief + report contract
- reviewer hook
- 并行调度

验收标准：

- 独立子任务可以并行
- 父 agent 能整合结果
- 对高风险实现能走 review gate

### Phase 5：审批、工件与可视化

交付：

- approval queue
- traces / reviews / dashboards / machine-state
- HTML/JSON artifact 导出
- 简单状态预览页面

验收标准：

- 能看到 agent 当前在做什么
- 能审计一个 goal 是怎么推进的
- 能定位为什么卡住

## 26. 推荐的第一版目录

如果你想尽快开工，我建议第一版直接按下面的目录来：

```text
code-agent/
├── apps/
│   └── cli/
│       └── index.ts
├── packages/
│   ├── core/
│   │   ├── runtime.ts
│   │   ├── orchestrator.ts
│   │   └── policies.ts
│   ├── llm/
│   │   ├── client.ts
│   │   └── prompt-builder.ts
│   ├── tools/
│   │   ├── registry.ts
│   │   ├── file-tools.ts
│   │   ├── shell-tools.ts
│   │   ├── git-tools.ts
│   │   └── state-tools.ts
│   ├── skills/
│   │   ├── discovery.ts
│   │   ├── router.ts
│   │   └── loader.ts
│   ├── goals/
│   │   └── governor.ts
│   ├── plans/
│   │   └── manager.ts
│   ├── subagents/
│   │   └── manager.ts
│   ├── memory/
│   │   ├── manager.ts
│   │   └── state-store.ts
│   ├── context/
│   │   └── builder.ts
│   └── shared/
│       ├── config.ts
│       └── fs-utils.ts
├── prompts/
├── skills/
└── docs/
```

## 27. 一句话结论

如果把 Codex 风格 agent 拆开看，它本质上不是“一个会写代码的大模型”，而是这几层能力的组合：

- 一个受 runtime 约束的 tool-calling loop
- 一套可渐进加载的 skills / workflows
- 一个可治理的 `/goal` 状态机
- 一套分层上下文与记忆管理
- 一个可隔离、可回收、可审计的 subagent 机制

先把这五层搭稳，再去追求更多表面能力，工程成功率会高很多。
