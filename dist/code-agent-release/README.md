# Coding Agent

一个面向终端的 coding agent 骨架，参考 Codex 的工作流设计：

- 当前工作目录默认作为项目根目录
- 支持多轮 CLI 对话
- 有工具注册与调度层
- 支持 `SKILL.md` 发现与按需加载
- 支持 session、goal、plan、memory 的本地持久化
- 预留 subagent 和更强上下文治理接口

文档导航见 [docs/README.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/docs/README.md)。
集成上手可直接看 [docs/integration-guide.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/docs/integration-guide.md)。
最小前端 demo 见 [apps/demo/README.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/apps/demo/README.md)。
版本更新记录见 [CHANGELOG.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/CHANGELOG.md)。
发布清单见 [RELEASE.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/RELEASE.md)。
后续演进方向见 [ROADMAP.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/ROADMAP.md)。
打包清单结构见 [docs/bundle-summary-schema.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/docs/bundle-summary-schema.md)。
发布打包说明见 [docs/release-packaging.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/docs/release-packaging.md)。
插件封装入口见 [.codex-plugin/plugin.json](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/.codex-plugin/plugin.json)。
插件打包说明见 [docs/codex-plugin-packaging.md](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/docs/codex-plugin-packaging.md)。

## 快速开始

优先使用仓库自带启动脚本：

```bash
./bin/code-agent chat
```

如需自动拉起 chat、发送测试输入并监控输出，可用：

```bash
/Users/zyb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./scripts/chat-monitor.js --message "你是谁呀"
```

也可以直接指定 Node：

```bash
/Users/zyb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./apps/cli/index.js chat
```

其它常用命令：

```bash
./bin/code-agent run "检查当前项目结构"
./bin/code-agent next
./bin/code-agent strategy show
./bin/code-agent strategy set conservative
./bin/code-agent goal create "实现一个新的文件搜索工具"
./bin/code-agent goal show
./bin/code-agent goal list
./bin/code-agent goal cancel
./bin/code-agent goal resume <id>
./bin/code-agent goal diagnose
./bin/code-agent session show
./bin/code-agent session history 10
./bin/code-agent plan show
./bin/code-agent plan summary
./bin/code-agent plan set-status 2 in_progress
./bin/code-agent plan retry 3
./bin/code-agent plan skip 4
./bin/code-agent plan reset-blocked
./bin/code-agent subagents run "inspect parser flow" "focus on apps/cli and packages/core"
./bin/code-agent subagents run-readonly "check governance state"
./bin/code-agent subagents summary 5
./bin/code-agent subagents set-status <id> accepted "safe to adopt"
./bin/code-agent plan execute
./bin/code-agent plan export "my implementation plan"
./bin/code-agent plan-runs list
./bin/code-agent plan-artifacts list
./bin/code-agent skills list
./bin/code-agent subagents list
./bin/code-agent demo preview 4173
./bin/code-agent reviews run plan
./bin/code-agent reviews run repo
./bin/code-agent reviews run code
./bin/code-agent reviews run approval
./bin/code-agent reviews bundles 5
./bin/code-agent reviews export
./bin/code-agent reviews list
./bin/code-agent review-artifacts list
./bin/code-agent approvals list
./bin/code-agent approvals retry <id>
./bin/code-agent approval-artifacts export <approvalId>
./bin/code-agent workspace snapshot "before-review"
./bin/code-agent workspace snapshots
./bin/code-agent workspace diff
./bin/code-agent workflow run "release workflow"
./bin/code-agent workflow list
./bin/code-agent workflow bundles 5
./bin/code-agent workflow export
./bin/code-agent workflow-artifacts list
./bin/code-agent traces list 20
./bin/code-agent traces bundles 5
./bin/code-agent trace-artifacts export
./bin/code-agent trace-artifacts list
./bin/code-agent config show
./bin/code-agent dashboard show
./bin/code-agent bundle-index show
./bin/code-agent bundle-index export "bundle index snapshot"
./bin/code-agent bundle-index-artifacts list
./bin/code-agent dashboard export "project snapshot"
./bin/code-agent dashboard-artifacts list
./bin/code-agent machine-state show
./bin/code-agent machine-state ui
./bin/code-agent machine-state ui-export "ui snapshot"
./bin/code-agent machine-state ui-html-export "ui dashboard"
./bin/code-agent machine-state ui-demo-export "ui demo"
./bin/code-agent machine-state summary
./bin/code-agent machine-state index
./bin/code-agent machine-state index-export "state index"
./bin/code-agent machine-state demo-export "integration demo"
./bin/code-agent machine-state schema
./bin/code-agent machine-state diff
./bin/code-agent machine-state export "integration snapshot"
./bin/code-agent machine-state-artifacts list
./bin/code-agent repo status
./bin/code-agent repo diff
./bin/code-agent repo log 5
```

交互式 `chat` 模式里也支持：

```text
/goal create <objective>
/next
/strategy show
/strategy set conservative
/goal show
/goal list
/goal complete
/goal cancel
/goal resume <id>
/goal diagnose
/session show
/session history 10
/plan show
/plan summary
/plan set-status 2 in_progress
/plan retry 3
/plan skip 4
/plan reset-blocked
/subagents run "inspect parser flow" "focus on apps/cli and packages/core"
/subagents run-readonly "check governance state"
/subagents summary 5
/subagents set-status <id> accepted "safe to adopt"
/plan execute
/plan export <title>
/plan-runs list
/plan-artifacts list
/skills list
/subagents list
/demo preview 4173
/reviews run plan
/reviews run repo
/reviews run code
/reviews run approval
/reviews bundles 5
/reviews export
/reviews list
/review-artifacts list
/approvals list
/approvals retry <id>
/approval-artifacts export <approvalId>
/workspace snapshot <label>
/workspace snapshots
/workspace diff
/workflow run <title>
/workflow list
/workflow bundles 5
/workflow export
/workflow-artifacts list
/traces list 20
/traces bundles 5
/trace-artifacts export
/trace-artifacts list
/config show
/dashboard show
/bundle-index show
/bundle-index export <title>
/bundle-index-artifacts list
/dashboard export <title>
/dashboard-artifacts list
/machine-state show
/machine-state ui
/machine-state ui-export <title>
/machine-state ui-html-export <title>
/machine-state ui-demo-export <title>
/machine-state summary
/machine-state index
/machine-state index-export <title>
/machine-state demo-export <title>
/machine-state schema
/machine-state diff
/machine-state export <title>
/machine-state-artifacts list
/repo status
/repo diff
/repo log 5
/status
```

## 环境变量

- 项目根目录下的 `.env` 会在启动时自动加载。
- 支持 `export KEY=value` 和普通 `KEY=value` 两种写法。
- `OPENAI_*` / `CODE_AGENT_*` 会优先使用 `.env` 中的值。
- 如需禁用 `.env` 自动注入，可设置 `CODE_AGENT_DISABLE_DOTENV=1`。

- `OPENAI_API_KEY`: 必填，模型调用密钥
- `OPENAI_MODEL`: 可选，默认 `gpt-5.5`
- `OPENAI_BASE_URL`: 可选，默认 `https://api.openai.com/v1`
- `OPENAI_TIMEOUT_MS`: 可选，请求超时毫秒数，默认 `30000`
- `OPENAI_MAX_RETRIES`: 可选，暂时性 Responses API 错误的自动重试次数，默认 `2`
- `CODE_AGENT_HOME`: 可选，状态目录，默认 `<projectRoot>/.coding-agent`
- `CODE_AGENT_USER_SKILL_DIR`: 可选，user-global skills 目录，默认 `~/.code-agent/skills`
- `CODE_AGENT_ARTIFACTS_DIR`: 可选，artifact 根目录，默认 `<projectRoot>/docs`
- `CODE_AGENT_WORKSPACE_ROOTS`: 可选，额外 workspace roots，使用系统路径分隔符连接；这些路径内的文件也允许读取/写入/作为 shell cwd
- `CODE_AGENT_ALLOW_PATHS`: 可选，额外 allowlist 路径，使用系统路径分隔符连接
- `CODE_AGENT_MOCK_MODEL`: 可选，设为 `1` 时启用本地 mock model 来验证 tool-calling 与策略回退路径
- `CODE_AGENT_MAX_TOOL_RISK`: 可选，限制主 agent 允许执行的最高工具风险级别，默认 `caution`
- `CODE_AGENT_SUBAGENT_MAX_TOOL_RISK`: 可选，限制 subagent 允许执行的最高工具风险级别，默认 `caution`
- `CODE_AGENT_REQUIRE_CONFIRM_WRITE`: 可选，预留的写操作确认策略开关
- `CODE_AGENT_AUTO_WORKFLOW`: 可选，设为 `1` 时在满足条件下自动运行 delivery workflow
- `CODE_AGENT_ENFORCE_SUGGESTED_FIRST_TOOL`: 可选，设为 `1` 时在线模式首个工具若偏离建议集合会先触发重考虑
- `CODE_AGENT_DEBUG`: 可选，设为 `1` 时输出 OpenAI 请求相关 debug 日志
- `CODE_AGENT_DISABLE_DOTENV`: 可选，设为 `1` 时跳过项目根目录 `.env` 的自动加载

## 当前能力

- CLI `chat` 和 `run`
- 基于 Responses API 的 function-calling orchestration
- 文件、搜索、shell、skill、plan、goal、memory 工具
- repo-local 与 built-in skills
- repo-local / user-global / built-in 三层 skills 优先级
- skill support files 感知：可发现 `references/`、`scripts/`、`assets/` 并在激活时注入相关上下文
- SQLite 本地状态存储
- 基础 goal / plan / skills CLI 命令
- 更完整的 goal 治理 CLI：create/show/list/complete/cancel/resume
- goal blocked 审计：同一治理阻塞连续出现时由 runtime 自动累计并标记 blocked
- 持久化 plan run / review 记录
- 持久化 approval request，并在 workflow review 失败时自动生成审批 gate
- 将活动计划导出到 `docs/agent-plans/` 工件
- 基础 git/repo 检查与 code-aware review
- 将 review 结果导出到 `docs/agent-reviews/` 工件
- 无 git 场景下的 workspace snapshot / diff 能力
- 端到端 delivery workflow 运行与记录
- 将 workflow 结果导出到 `docs/agent-workflows/` 工件
- model/tool trace 持久化与查询
- runtime 配置查看与自动 workflow 开关
- 将 traces 导出到 `docs/agent-traces/` 工件
- 统一 dashboard 聚合查询
- 将 dashboard 状态导出到 `docs/agent-dashboard/` 工件
- 将 bundle-index 状态导出到 `docs/agent-bundles/` 工件
- artifact 根目录可通过 `CODE_AGENT_ARTIFACTS_DIR` 重定向到项目外
- bundle-index 聚合视图
- 模型侧可直接读取 / 导出 bundle-index artifacts
- 首个工具建议遵循的可选 runtime 约束
- 面向当前用户请求的 relevant repo context 选择
- prompt 预算裁剪，避免 repo / dashboard / skill 上下文无限膨胀
- 结构化 working memory 摘要，而不是无限堆叠原始 transcript
- subagent 窄上下文打包，向子会话下发目标、计划、相关文件与摘要片段
- runtime 统一工具治理，按 `safe/caution/restricted/forbidden` 风险级别拦截不允许的工具调用
- workflow review checkpoint 与 approval request 治理链路
- 独立 approval artifact 导出，串起审批请求、override、retry 的审计信息
- 版本化 machine-state JSON 快照，便于 UI / 外部调度器稳定消费
- repo 内提供 machine-state schema 文档与紧凑 summary 视图，便于外部集成
- machine-state diff 同时提供结构化 changes 和紧凑 human summary
- repo 内新增 machine-state API contract 文档，便于外部系统按契约接入
- machine-state 额外提供 UI payload 视图，适合前端卡片面板直接消费
- UI payload 也可单独导出为工件，便于前端联调和回归
- ui-state 现在包含预分组 `sections`，便于前端直接按块渲染
- machine-state 额外提供统一 state artifact index，便于外部导航 snapshot/ui 工件
- state artifact index 也可单独导出为工件，便于外部缓存和导航
- ui-state 还可直接导出为静态 HTML 仪表板，便于快速演示和联调
- ui-state 还可导出为一页完整 demo，直接组合 ui payload 和 state artifact index

## 当前限制

- 当前依赖 Node 24 自带的 `node:sqlite` 实验特性作为本地状态存储
- subagent 已有运行时接口，但第一版以同步、窄上下文子会话为主
- 不依赖官方 SDK，直接调用 Responses API HTTP 接口

## 验证

```bash
/Users/zyb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./scripts/check.js
/Users/zyb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./scripts/smoke-test.js
```
