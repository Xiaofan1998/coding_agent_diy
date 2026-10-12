import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath } from "../shared/workspace-roots.js";
import { wrapSuccess, wrapError } from "./registry.js";

const execFileAsync = promisify(execFile);

const BLOCKED_SNIPPETS = ["rm -rf /", "sudo ", "shutdown", "reboot", "mkfs", ":(){:|:&};:"];

export function createShellTool(config) {
  return {
    name: "run_shell",
    readOnlyHint: false,
    concurrencySafeHint: "dynamic",
    isReadOnly: ({ command }) => shellCommandLooksReadOnly(command),
    isConcurrencySafe: ({ command }) => shellCommandLooksReadOnly(command),
    description: "Run a shell command inside the project root.",
    riskLevel: "caution",
    granularity: "macro",
    errorRecovery: {
      rootCauseHint: "Command not found, permission denied, or unsafe command blocked",
      safeRetry: "Verify the command is correct and safe, use explicit paths",
      stopCondition: "Command confirmed unsafe or blocked by policy"
    },
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string" },
        cwd: { type: "string" }
      },
      required: ["command"],
      additionalProperties: false
    },
    execute: async ({ command, cwd = config.projectRoot }) => {
      for (const snippet of BLOCKED_SNIPPETS) {
        if (command.includes(snippet)) {
          throw new Error(`Blocked shell command due to safety policy: ${snippet}`);
        }
      }

      const resolvedCwd = resolveWorkspacePath(config, cwd, { access: "read" });

      let stdout = "";
      let stderr = "";
      try {
        const result = await execFileAsync("zsh", ["-lc", command], {
          cwd: resolvedCwd
        });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (error) {
        stdout = typeof error?.stdout === "string" ? error.stdout : "";
        stderr = typeof error?.stderr === "string" ? error.stderr : "";
        const exitCode = Number.isInteger(error?.code) ? error.code : null;
        const signal = typeof error?.signal === "string" ? error.signal : null;
        return wrapError(error instanceof Error ? error : new Error(String(error)), {
          summary: exitCode === null
            ? "Command failed"
            : `Command failed with exit code ${exitCode}`,
          data: {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode,
            signal,
            command
          },
          next_actions: [
            "Inspect stdout, stderr, and exitCode before retrying.",
            "If missing files or environment variables are acceptable, make the command tolerate them explicitly."
          ]
        });
      }
      const trimmedStdout = stdout.trim();
      const trimmedStderr = stderr.trim();
      return wrapSuccess({ stdout: trimmedStdout, stderr: trimmedStderr, exitCode: 0 }, {
        summary: trimmedStdout
          ? `Command executed (${trimmedStdout.split("\n").length} lines stdout)`
          : trimmedStderr
            ? `Command completed with stderr output (${trimmedStderr.split("\n").length} lines)`
            : "Command executed (no output)"
      });
    }
  };
}


function shellCommandLooksReadOnly(command) {
  const text = String(command || "").trim();
  if (!text) {
    return false;
  }
  if (shellCommandLooksWriteLike(text)) {
    return false;
  }
  return /^(pwd|ls|find|grep|rg|cat|head|tail|wc|du|df|stat|file|git\s+(status|diff|log|show|branch|rev-parse|remote|ls-files)\b|npm\s+(test|run\s+test)\b|node\s+--check\b)/.test(text);
}

function shellCommandLooksWriteLike(command) {
  return /(^|[\s;&|])(rm|mv|cp|touch|mkdir|rmdir|chmod|chown|tee|install|python|python3|node|npm|pnpm|yarn|git\s+(add|commit|push|pull|merge|rebase|reset|checkout|switch|restore|clean|apply)|bash|sh|zsh)\b/.test(command)
    || /(^|[\s;&|])sed\s+-i\b/.test(command)
    || /(^|\s)(>|>>)(\s|$)/.test(command)
    || /\b(writeFile|appendFile|createWriteStream)\s*\(/.test(command);
}
