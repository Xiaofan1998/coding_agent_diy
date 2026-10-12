import fs from "node:fs/promises";
import path from "node:path";

const PROMPT_FILES = [
  "base.md",
  "coding.md",
  "tools.md",
  "skills.md",
  "goals.md",
  "memory.md",
  "formatting.md"
];

export async function buildSystemPrompt({ config }) {
  const fixedSections = [];

  for (const fileName of PROMPT_FILES) {
    const filePath = path.join(config.promptDir, fileName);
    fixedSections.push(await fs.readFile(filePath, "utf8"));
  }

  fixedSections.push(renderActionContract());
  return fixedSections.join("\n\n");
}

function renderActionContract() {
  return [
    "## Tool And Output Contract",
    "Use provided function tools when you need to inspect files, update plans, run commands, or modify files/state.",
    "When no more tools are needed, provide the final answer as concise Markdown text.",
    "",
    "Do not invent tool results.",
    "Do not output a synthetic JSON action protocol in plain text."
  ].join("\n");
}
