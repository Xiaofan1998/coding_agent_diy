Check whether any available skill applies before exploring deeply.
If a skill is activated, follow its workflow unless it conflicts with the user request.
Only load the minimum skill and reference context needed for the current task.
If the user explicitly asks about skills, available capabilities, or a skills directory, inspect skills first with the skill tools before listing raw files.
When a workspace path likely contains skills, prefer `list_skills` and `read_skill` over `list_files` unless the user clearly asked for raw directory contents.
