import readline from "node:readline";

const TOP_LEVEL_SLASH_COMMANDS = Object.freeze([
  {
    kind: "command",
    name: "skill",
    command: "skill",
    description: "Choose a skill, then type the request that should use it."
  },
  {
    kind: "command",
    name: "goal",
    command: "goal",
    description: "Create, inspect, resume, complete, or cancel a persistent goal."
  }
]);

const GOAL_COMMANDS = Object.freeze([
  { kind: "goal", name: "create", command: "create", description: "Create a goal and enter goal mode for following prompts." },
  { kind: "goal", name: "show", command: "show", description: "Show the active goal, or a goal by id." },
  { kind: "goal", name: "list", command: "list", description: "List recent goals." },
  { kind: "goal", name: "resume", command: "resume", description: "Resume a goal by id and enter goal mode." },
  { kind: "goal", name: "complete", command: "complete", description: "Mark the active goal, or a goal by id, complete." },
  { kind: "goal", name: "cancel", command: "cancel", description: "Cancel the active goal, or a goal by id." },
  { kind: "goal", name: "diagnose", command: "diagnose", description: "Explain current goal progress and blockers." }
]);

export function getSkillSuggestions(inputValue, skills, limit = 8) {
  const query = normalizeSkillQuery(inputValue);
  if (query === null) {
    return [];
  }

  return rankSkills(skills, query, limit);
}

export function getSlashSuggestions(inputValue, skills, limit = 8) {
  const state = parseSlashInput(inputValue);
  if (!state) {
    return [];
  }

  if (state.mode === "top") {
    return TOP_LEVEL_SLASH_COMMANDS
      .map((command, order) => ({
        ...command,
        order,
        score: scoreCommand(command, state.query)
      }))
      .filter((command) => state.query ? command.score > 0 : true)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, limit);
  }

  if (state.mode === "skill") {
    return rankSkills(skills, state.query, limit).map((skill) => ({
      ...skill,
      kind: "skill"
    }));
  }

  if (state.mode === "goal") {
    const commandQuery = firstToken(state.query).toLowerCase();
    return GOAL_COMMANDS
      .map((command) => ({
        ...command,
        score: scoreCommand(command, commandQuery)
      }))
      .filter((command) => commandQuery ? command.score > 0 : true)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  return [];
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
  skillProvider,
  modeLabel = ""
}) {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    const rl = readline.createInterface({ input, output });
    output.write(`${formatPlainPromptPrefix(modeLabel)} `);
    try {
      const answer = await new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(value);
        };
        rl.once("line", finish);
        rl.once("close", () => finish(null));
      });
      return answer === null ? "/exit" : String(answer).trim();
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
    let selectedGoalCommand = null;
    let selectedSlashCommand = null;

    readline.emitKeypressEvents(input);
    input.setRawMode(true);

    const getSuggestions = () => {
      if (selectedSkill || selectedGoalCommand) {
        return [];
      }

      let suggestionInput = buffer;
      if (selectedSlashCommand === "skill") {
        suggestionInput = `/skill ${buffer}`;
      } else if (selectedSlashCommand === "goal") {
        suggestionInput = `/goal ${buffer}`;
      }

      const suggestions = getSlashSuggestions(suggestionInput, skills, 8);
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
      const lines = [renderPromptLine({ modeLabel, selectedSlashCommand, selectedSkill, selectedGoalCommand, buffer })];
      if (suggestions.length > 0) {
        lines.push(`  ${renderSuggestionHeader(suggestions)}  (↑/↓ select, Enter/Tab choose)`);
        for (let index = 0; index < suggestions.length; index += 1) {
          const suggestion = suggestions[index];
          const marker = index === suggestionIndex ? "›" : " ";
          lines.push(`  ${marker} ${suggestion.name} — ${truncate(suggestion.description || "(no description)", 72)}`);
        }
      }
      const terminalColumns = getTerminalColumns(output);
      const promptCursorColumn = getPromptCursorColumn({
        modeLabel,
        selectedSlashCommand,
        selectedSkill,
        selectedGoalCommand,
        cursor,
        buffer
      });
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
      const suggestion = suggestions[suggestionIndex];
      if (suggestion.kind === "command") {
        selectedSlashCommand = suggestion.command;
        buffer = "";
        cursor = 0;
      } else if (suggestion.kind === "skill") {
        selectedSkill = suggestion;
        selectedSlashCommand = "skill";
        buffer = "";
        cursor = 0;
      } else if (suggestion.kind === "goal") {
        selectedGoalCommand = suggestion.command;
        selectedSlashCommand = "goal";
        buffer = "";
        cursor = 0;
      }
      suggestionIndex = 0;
    };

    const onKeypress = (_str, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup("/exit");
        return;
      }

      if (key.name === "return") {
        if (!selectedSkill && !selectedGoalCommand && getSuggestions().length > 0) {
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
        if ((selectedSkill || selectedGoalCommand || selectedSlashCommand) && cursor === 0 && buffer.length === 0) {
          if (selectedSkill) {
            selectedSkill = null;
          } else if (selectedGoalCommand) {
            selectedGoalCommand = null;
          } else {
            selectedSlashCommand = null;
          }
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
      const line = composeLine({ selectedSlashCommand, selectedSkill, selectedGoalCommand, buffer: currentBuffer });
      output.write(`${formatPlainPromptPrefix(modeLabel)} ${renderPrintableEcho({ selectedSlashCommand, selectedSkill, selectedGoalCommand, buffer: currentBuffer })}\n`);
      resolve(line.trim());
    }
  });
}

function parseSlashInput(inputValue) {
  const value = String(inputValue || "");
  if (!value.startsWith("/")) {
    return null;
  }

  const withoutSlash = value.slice(1);
  const topMatch = withoutSlash.match(/^(\S*)(?:\s+([\s\S]*))?$/);
  const command = String(topMatch?.[1] || "").toLowerCase();
  const rest = topMatch?.[2] ?? "";

  if (command === "skill" || command === "skills") {
    return { mode: "skill", query: rest.trim().toLowerCase() };
  }

  if (command === "goal") {
    return { mode: "goal", query: rest.trim().toLowerCase() };
  }

  return { mode: "top", query: withoutSlash.trim().toLowerCase() };
}

function normalizeSkillQuery(inputValue) {
  const state = parseSlashInput(inputValue);
  if (!state) {
    return null;
  }
  if (state.mode === "skill") {
    return state.query;
  }
  if (state.mode === "top") {
    return state.query.replace(/^skill\s+/i, "").trim().toLowerCase();
  }
  return null;
}

function rankSkills(skills, query, limit) {
  return (Array.isArray(skills) ? skills : [])
    .map((skill) => ({
      ...skill,
      score: scoreSkill(skill, query)
    }))
    .filter((skill) => query ? skill.score > 0 : true)
    .sort((a, b) => b.score - a.score || String(a.name || "").localeCompare(String(b.name || "")))
    .slice(0, limit);
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

function scoreCommand(command, query) {
  if (!query) {
    return 1;
  }
  const name = String(command.name || "").toLowerCase();
  const haystack = `${name} ${String(command.description || "").toLowerCase()}`;
  let score = 0;
  if (name.startsWith(query)) {
    score += 5;
  }
  if (haystack.includes(query)) {
    score += 3;
  }
  return score;
}

function firstToken(value) {
  return String(value || "").trim().split(/\s+/)[0] || "";
}

function truncate(value, maxChars) {
  const text = String(value || "");
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function renderSuggestionHeader(suggestions) {
  const firstKind = suggestions[0]?.kind;
  if (firstKind === "command") {
    return "Commands";
  }
  if (firstKind === "goal") {
    return "Goal commands";
  }
  return "Skills";
}

function renderPromptLine({ modeLabel, selectedSlashCommand, selectedSkill, selectedGoalCommand, buffer }) {
  return `${formatPromptPrefix(modeLabel)} ${renderInputPrefix({ selectedSlashCommand, selectedSkill, selectedGoalCommand })}${buffer}`;
}

function renderPrintableEcho({ selectedSlashCommand, selectedSkill, selectedGoalCommand, buffer }) {
  return `${renderPlainInputPrefix({ selectedSlashCommand, selectedSkill, selectedGoalCommand })}${buffer}`.trimEnd();
}

function renderInputPrefix({ selectedSlashCommand, selectedSkill, selectedGoalCommand }) {
  if (selectedSkill) {
    return `${renderSelectedToken(selectedSkill.name)} `;
  }
  if (selectedGoalCommand) {
    return `${renderSelectedToken(`/goal ${selectedGoalCommand}`)} `;
  }
  if (selectedSlashCommand === "skill") {
    return `${renderSelectedToken("/skill")} `;
  }
  if (selectedSlashCommand === "goal") {
    return `${renderSelectedToken("/goal")} `;
  }
  return "";
}

function renderPlainInputPrefix({ selectedSlashCommand, selectedSkill, selectedGoalCommand }) {
  if (selectedSkill) {
    return `[${selectedSkill.name}] `;
  }
  if (selectedGoalCommand) {
    return `/goal ${selectedGoalCommand} `;
  }
  if (selectedSlashCommand === "skill") {
    return "/skill ";
  }
  if (selectedSlashCommand === "goal") {
    return "/goal ";
  }
  return "";
}

function renderSelectedToken(value) {
  return `\x1b[47m\x1b[30m ${String(value || "")} \x1b[0m`;
}

function formatPlainPromptPrefix(modeLabel) {
  return modeLabel ? `(${modeLabel}) >` : ">";
}

function formatPromptPrefix(modeLabel) {
  return modeLabel ? `\x1b[36m(${modeLabel})\x1b[0m >` : ">";
}

function getPromptCursorColumn({ modeLabel, selectedSlashCommand, selectedSkill, selectedGoalCommand, cursor, buffer }) {
  const visiblePrefix = `${formatPlainPromptPrefix(modeLabel)} ${renderPlainInputPrefix({ selectedSlashCommand, selectedSkill, selectedGoalCommand })}`;
  return stringDisplayWidth(visiblePrefix) + stringDisplayWidth(cursorSlice(cursor, buffer));
}

function composeLine({ selectedSlashCommand, selectedSkill, selectedGoalCommand, buffer }) {
  const query = String(buffer || "").trim();
  if (selectedSkill) {
    return `${buildSkillCommand(selectedSkill.name)}${query}`.trimEnd();
  }
  if (selectedGoalCommand) {
    return `/goal ${selectedGoalCommand} ${query}`.trimEnd();
  }
  if (selectedSlashCommand === "skill") {
    return `/skill ${query}`.trimEnd();
  }
  if (selectedSlashCommand === "goal") {
    return `/goal ${query}`.trimEnd();
  }
  return buffer;
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
  return String(value || "").replace(/\x1b\[[0-9;]*m/g, "");
}
