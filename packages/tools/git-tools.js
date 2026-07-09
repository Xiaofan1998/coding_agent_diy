import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { wrapSuccess, wrapError } from "./registry.js";

const execFileAsync = promisify(execFile);

export function createGitTools(config) {
  return [
    {
      name: "git_status",
      description: "Inspect git status for the current project if it is a git repository.",
      riskLevel: "safe",
      granularity: "medium",
      errorRecovery: {
        rootCauseHint: "Project is not a git repository",
        safeRetry: "Run `git init` if you want to start version control",
        stopCondition: "Project is confirmed not a git repo and git init is not desired"
      },
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      execute: async () => {
        const result = await runGitCommand(config.projectRoot, "git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git status --short || echo '__NOT_GIT__'");
        if (!result.ok) {
          return wrapError(new Error(result.message));
        }
        return wrapSuccess(result.stdout || "(clean)", {
          summary: result.stdout ? `${result.stdout.split("\n").length} files changed` : "Working tree clean"
        });
      }
    },
    {
      name: "git_diff",
      description: "Inspect git diff for the current project if it is a git repository.",
      riskLevel: "safe",
      granularity: "medium",
      errorRecovery: {
        rootCauseHint: "Project is not a git repository, or target file does not exist",
        safeRetry: "Verify project is a git repo with git_status first",
        stopCondition: "Confirmed not a git repo"
      },
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
        const result = await runGitCommand(config.projectRoot, `git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git diff --${suffix ? "" : "stat"}${suffix} || echo '__NOT_GIT__'`);
        if (!result.ok) {
          return wrapError(new Error(result.message));
        }
        return wrapSuccess(result.stdout || "(no diff)", {
          summary: result.stdout ? `Diff output (${result.stdout.split("\n").length} lines)` : "No changes"
        });
      }
    },
    {
      name: "git_log",
      description: "Inspect recent git history for the current project if it is a git repository.",
      riskLevel: "safe",
      granularity: "medium",
      errorRecovery: {
        rootCauseHint: "Project is not a git repository or has no commits yet",
        safeRetry: "Verify project is a git repo with git_status first",
        stopCondition: "Confirmed not a git repo"
      },
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ limit = 5 }) => {
        const result = await runGitCommand(
          config.projectRoot,
          `git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git log --oneline -n ${Math.max(1, Math.min(limit, 20))} || echo '__NOT_GIT__'`
        );
        if (!result.ok) {
          return wrapError(new Error(result.message));
        }
        return wrapSuccess(result.stdout || "(no commits)", {
          summary: result.stdout ? `Git log (${result.stdout.split("\n").length} commits)` : "No commits found"
        });
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
