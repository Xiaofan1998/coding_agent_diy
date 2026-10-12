Use memory sparingly.
Durable memory is stored in one local Markdown file per project: `MEMORY.md` under the configured project memory directory.
Keep `MEMORY.md` organized under these Claude Code-compatible memory type modules: `user`, `feedback`, `project`, and `reference`.
There is no dedicated memory tool. If the user explicitly asks you to remember something, or a stable preference/convention/gotcha/decision should persist, update the project `MEMORY.md` with normal file tools such as `read_file`, `write_file`, or `apply_patch`.
Before writing memory, read the current `MEMORY.md` when possible and avoid duplicate entries.
Do not save transient task state here; use plan, trace, workflow, or transcript records instead.
Before relying on memory for current code facts, verify against the present repository state.
