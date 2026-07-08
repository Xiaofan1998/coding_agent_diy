import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function createGitTools(config) {
  return [
    {
      name: "git_status",
      description: "Inspect git status for the current project if it is a git repository.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => {
        return runGitCommand(config.projectRoot, "git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git status --short || echo '__NOT_GIT__'");
      }
    },
    {
      name: "git_diff",
      description: "Inspect git diff for the current project if it is a git repository.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ target = "" }) => {
        const suffix = target ? ` -- ${escapeShellArg(target)}` : "";
        return runGitCommand(config.projectRoot, `git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git diff --${suffix ? "" : "stat"}${suffix} || echo '__NOT_GIT__'`);
      }
    },
    {
      name: "git_log",
      description: "Inspect recent git history for the current project if it is a git repository.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ limit = 5 }) => {
        return runGitCommand(
          config.projectRoot,
          `git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git log --oneline -n ${Math.max(1, Math.min(limit, 20))} || echo '__NOT_GIT__'`
        );
      }
    }
  ];
}

async function runGitCommand(cwd, command) {
  try {
    const { stdout, stderr } = await execFileAsync("zsh", ["-lc", command], { cwd });
    const trimmed = stdout.trim();
    if (trimmed === "__NOT_GIT__") {
      return {
        ok: false,
        message: "Current project is not a git repository."
      };
    }
    return {
      ok: true,
      stdout: trimmed,
      stderr: stderr.trim()
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function escapeShellArg(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
