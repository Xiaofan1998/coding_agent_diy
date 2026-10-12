# 当前项目 system prompt 中文版（稳定版）

> 构建输入：当前目录 `/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617`。已对常见密钥形态脱敏。英文原文见 `artifacts/current-system-prompt.md`。

当前 system prompt 只由固定指令文件和工具输出契约组成，不拼接 Runtime Context、repo snapshot、dashboard、session summary、active goal、memory 正文、activated skills、tool list 或仓库源码片段。这样每轮请求的 system prompt 尽量保持不变，以提高 prompt cache 命中率。

固定指令文件包括：

- `prompts/base.md`：agent 身份、持续推进和基本工作方式。
- `prompts/coding.md`：代码修改、验证、避免无关重构等规则。
- `prompts/tools.md`：工具调用、风险等级、并发安全、工具依赖关系规则。
- `prompts/skills.md`：skills 的发现、读取和使用规则。
- `prompts/goals.md`：active goal 下的推进、阻塞和完成规则。
- `prompts/memory.md`：项目 memory 的保存和检索规则。
- `prompts/formatting.md`：最终输出格式。

每轮动态信息不进入 system prompt。当前只保留两类临时消息：

1. 如果存在 active goal，请求前插入一条 ephemeral `<goal-context>` 消息；保存 transcript 时会过滤掉。
2. 每个 turn 启动异步 memory prefetch。首轮模型请求不会等待它；如果某次 loop iteration 的工具执行后 prefetch 已完成，则插入一条 ephemeral `<relevant-memory>` 消息，让下一次模型请求看到相关 memory。没完成就跳过，下一次 iteration 再尝试。

仓库源码片段不会被预加载；需要源码内容时应使用搜索/读取工具。
