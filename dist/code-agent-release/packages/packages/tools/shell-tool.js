import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath } from "../shared/workspace-roots.js";

const execFileAsync = promisify(execFile);

const BLOCKED_SNIPPETS = ["rm -rf /", "sudo ", "shutdown", "reboot", "mkfs", ":(){:|:&};:"];

export function createShellTool(config) {
  return {
    name: "run_shell",
    description: "Run a shell command inside the project root.",
    riskLevel: "caution",
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

      const resolvedCwd = resolveWorkspacePath(config, cwd);

      const { stdout, stderr } = await execFileAsync("zsh", ["-lc", command], {
        cwd: resolvedCwd
      });
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
    }
  };
}
