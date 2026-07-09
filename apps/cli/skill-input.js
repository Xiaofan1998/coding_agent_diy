import readline from "node:readline";

export function getSkillSuggestions(inputValue, skills, limit = 8) {
  const query = normalizeSkillQuery(inputValue);
  if (query === null) {
    return [];
  }

  return (Array.isArray(skills) ? skills : [])
    .map((skill) => ({
      ...skill,
      score: scoreSkill(skill, query)
    }))
    .filter((skill) => query ? skill.score > 0 : true)
    .sort((a, b) => b.score - a.score || String(a.name || "").localeCompare(String(b.name || "")))
    .slice(0, limit);
}

export function buildSkillCommand(skillName) {
  return `/skill ${String(skillName || "").trim()} `;
}

export function normalizeSkillCommandLine(rawLine) {
  const line = String(rawLine || "").trim();
  const match = line.match(/^\/skill\s+([A-Za-z0-9_.:-]+)\s*([\s\S]*)$/);
  if (!match) {
    return line;
  }

  const [, skillName, rest] = match;
  const trimmedRest = String(rest || "").trim();
  if (!trimmedRest) {
    return `Use skill "${skillName}" for the next response and explain how to use it in this project.`;
  }
  return `Use skill "${skillName}" for this request.\n\nUser request: ${trimmedRest}`;
}

export async function promptForChatInput({
  input,
  output,
  skillProvider
}) {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    const rl = readline.createInterface({ input, output });
    try {
      return (await rl.question("> ")).trim();
    } finally {
      rl.close();
    }
  }

  const skills = await skillProvider();
  return new Promise((resolve) => {
    let buffer = "";
    let cursor = 0;
    let suggestionIndex = 0;
    let rendered = false;
    let renderedRowCount = 0;
    let promptCursorRowOffset = 0;
    let selectedSkill = null;

    readline.emitKeypressEvents(input);
    input.setRawMode(true);

    const getSuggestions = () => {
      if (selectedSkill) {
        return [];
      }
      const suggestions = getSkillSuggestions(buffer, skills, 8);
      if (suggestionIndex >= suggestions.length) {
        suggestionIndex = Math.max(0, suggestions.length - 1);
      }
      return suggestions;
    };

    const clearRender = () => {
      if (!rendered) {
        return;
      }
      if (promptCursorRowOffset > 0) {
        readline.moveCursor(output, 0, -promptCursorRowOffset);
      }
      readline.cursorTo(output, 0);
      readline.clearScreenDown(output);
      rendered = false;
      renderedRowCount = 0;
      promptCursorRowOffset = 0;
    };

    const render = () => {
      clearRender();
      const suggestions = getSuggestions();
      const lines = [renderPromptLine({ selectedSkill, buffer })];
      if (suggestions.length > 0) {
        lines.push("  Skills  (↑/↓ select, Enter/Tab choose)");
        for (let index = 0; index < suggestions.length; index += 1) {
          const skill = suggestions[index];
          const marker = index === suggestionIndex ? "›" : " ";
          lines.push(`  ${marker} ${skill.name} — ${truncate(skill.description || "(no description)", 72)}`);
        }
      }
      const terminalColumns = getTerminalColumns(output);
      const promptCursorColumn = getPromptCursorColumn({ selectedSkill, cursor, buffer });
      renderedRowCount = countRenderedRows(lines, terminalColumns);
      promptCursorRowOffset = Math.floor(promptCursorColumn / terminalColumns);
      output.write(lines.join("\n"));
      if (renderedRowCount > 1) {
        readline.moveCursor(output, 0, -(renderedRowCount - 1));
      }
      if (promptCursorRowOffset > 0) {
        readline.moveCursor(output, 0, promptCursorRowOffset);
      }
      readline.cursorTo(output, promptCursorColumn % terminalColumns);
      rendered = true;
    };

    const insertSelectedSuggestion = () => {
      const suggestions = getSuggestions();
      if (suggestions.length === 0) {
        return;
      }
      selectedSkill = suggestions[suggestionIndex];
      buffer = "";
      cursor = 0;
    };

    const onKeypress = (_str, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup("/exit");
        return;
      }

      if (key.name === "return") {
        if (!selectedSkill && getSuggestions().length > 0) {
          insertSelectedSuggestion();
          render();
          return;
        }
        cleanup(buffer);
        return;
      }

      if (key.name === "tab") {
        insertSelectedSuggestion();
        render();
        return;
      }

      if (key.name === "up" && getSuggestions().length > 0) {
        suggestionIndex = Math.max(0, suggestionIndex - 1);
        render();
        return;
      }

      if (key.name === "down" && getSuggestions().length > 0) {
        suggestionIndex = Math.min(getSuggestions().length - 1, suggestionIndex + 1);
        render();
        return;
      }

      if (key.name === "left") {
        cursor = Math.max(0, cursor - 1);
        render();
        return;
      }

      if (key.name === "right") {
        cursor = Math.min(buffer.length, cursor + 1);
        render();
        return;
      }

      if (key.name === "backspace") {
        if (selectedSkill && cursor === 0 && buffer.length === 0) {
          selectedSkill = null;
          suggestionIndex = 0;
          render();
          return;
        }
        if (cursor > 0) {
          buffer = `${buffer.slice(0, cursor - 1)}${buffer.slice(cursor)}`;
          cursor -= 1;
        }
        suggestionIndex = 0;
        render();
        return;
      }

      if (typeof key.sequence === "string" && key.sequence && !key.ctrl && !key.meta) {
        buffer = `${buffer.slice(0, cursor)}${key.sequence}${buffer.slice(cursor)}`;
        cursor += key.sequence.length;
        suggestionIndex = 0;
        render();
      }
    };

    input.on("keypress", onKeypress);
    render();

    function cleanup(currentBuffer) {
      input.off("keypress", onKeypress);
      input.setRawMode(false);
      clearRender();
      const line = selectedSkill
        ? composeSelectedSkillLine(selectedSkill.name, currentBuffer)
        : currentBuffer;
      output.write(`> ${renderPrintableEcho({ selectedSkill, buffer: currentBuffer })}\n`);
      resolve(line.trim());
    }
  });
}

function normalizeSkillQuery(inputValue) {
  const value = String(inputValue || "");
  if (!value.startsWith("/")) {
    return null;
  }

  return value
    .replace(/^\//, "")
    .replace(/^skill\s+/i, "")
    .trim()
    .toLowerCase();
}

function scoreSkill(skill, query) {
  if (!query) {
    return 1;
  }

  const haystack = [
    skill.name,
    skill.description,
    skill.source
  ].join(" ").toLowerCase();

  let score = 0;
  if (haystack.includes(query)) {
    score += 5;
  }
  for (const token of query.split(/\s+/).filter(Boolean)) {
    if (haystack.includes(token)) {
      score += token.length >= 5 ? 3 : 1;
    }
  }
  if (String(skill.name || "").toLowerCase().startsWith(query)) {
    score += 4;
  }
  return score;
}

function truncate(value, maxChars) {
  const text = String(value || "");
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function renderPromptLine({ selectedSkill, buffer }) {
  if (!selectedSkill) {
    return `> ${buffer}`;
  }
  return `> ${renderSelectedSkillToken(selectedSkill.name)} ${buffer}`;
}

function renderPrintableEcho({ selectedSkill, buffer }) {
  if (!selectedSkill) {
    return buffer;
  }
  return `[${selectedSkill.name}] ${buffer}`.trimEnd();
}

function renderSelectedSkillToken(skillName) {
  return `\x1b[47m\x1b[30m ${String(skillName || "")} \x1b[0m`;
}

function getPromptCursorColumn({ selectedSkill, cursor, buffer }) {
  if (!selectedSkill) {
    return 2 + stringDisplayWidth(cursorSlice(cursor, buffer));
  }
  return 2 + stringDisplayWidth(String(selectedSkill.name || "")) + 3 + stringDisplayWidth(cursorSlice(cursor, buffer));
}

function composeSelectedSkillLine(skillName, buffer) {
  const query = String(buffer || "").trim();
  return `${buildSkillCommand(skillName)}${query}`.trimEnd();
}

function getTerminalColumns(output) {
  const columns = Number(output?.columns) || Number(process.stdout?.columns) || 80;
  return columns > 0 ? columns : 80;
}

function countRenderedRows(lines, terminalColumns) {
  return lines.reduce((total, line) => total + countWrappedRows(line, terminalColumns), 0);
}

function countWrappedRows(value, terminalColumns) {
  const width = stringDisplayWidth(stripAnsi(value));
  if (width <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(width / terminalColumns));
}

function stringDisplayWidth(value) {
  let width = 0;
  for (const char of String(value || "")) {
    const codePoint = char.codePointAt(0) || 0;
    width += isWideCharacter(codePoint) ? 2 : 1;
  }
  return width;
}

function isWideCharacter(codePoint) {
  return (
    codePoint >= 0x1100 && (
      codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
      (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    )
  );
}

function cursorSlice(cursor, value) {
  return String(value || "").slice(0, cursor);
}

function stripAnsi(value) {
  return String(value || "").replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, "");
}
