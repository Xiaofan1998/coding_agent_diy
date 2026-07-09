import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath } from "../shared/workspace-roots.js";
import { wrapSuccess, wrapError } from "./registry.js";

const execFileAsync = promisify(execFile);

export function createFileTools(config) {
  return [
    {
      name: "list_files",
      description: "List files under a directory relative to the project root.",
      riskLevel: "safe",
      granularity: "medium",
      errorRecovery: {
        rootCauseHint: "Path does not exist or permission denied",
        safeRetry: "Verify the path exists and is readable, then retry with a valid path",
        stopCondition: "Path is confirmed non-existent"
      },
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          limit: { type: "number" }
        },
        required: [],
        additionalProperties: false
      },
      execute: async ({ path: targetPath = ".", limit = 200 }) => {
        const absolute = resolveWorkspacePath(config, targetPath);
        const output = [];
        await walk(absolute, absolute, output, limit);
        return wrapSuccess(output, {
          summary: `Listed ${output.length} files in ${targetPath}`,
          artifacts: output.length <= 50 ? output : undefined
        });
      }
    },
    {
      name: "read_file",
      description: "Read a file from the project root and optionally limit the line range.",
      riskLevel: "safe",
      granularity: "micro",
      errorRecovery: {
        rootCauseHint: "File does not exist, path is outside workspace, or permission denied",
        safeRetry: "Use search_files or list_files first to verify the file path, then retry",
        stopCondition: "Confirmed file is outside workspace or does not exist"
      },
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          startLine: { type: "number" },
          endLine: { type: "number" }
        },
        required: ["path"],
        additionalProperties: false
      },
      execute: async ({ path: targetPath, startLine = 1, endLine = 200 }) => {
        const absolute = resolveWorkspacePath(config, targetPath);
        const raw = await fs.readFile(absolute, "utf8");
        const lines = raw.split("\n");
        const content = lines.slice(startLine - 1, endLine).join("\n");
        return wrapSuccess(content, {
          summary: `Read ${targetPath} (lines ${startLine}-${Math.min(endLine, lines.length)} of ${lines.length})`,
          artifacts: [targetPath],
          next_actions: lines.length > endLine ? [`read_file(${JSON.stringify(targetPath)}, startLine=${endLine + 1})`] : undefined
        });
      }
    },
    {
      name: "search_files",
      description: "Search for a text pattern in project files using ripgrep when available.",
      riskLevel: "safe",
      granularity: "medium",
      errorRecovery: {
        rootCauseHint: "ripgrep not installed, or pattern is invalid regex, or path outside workspace",
        safeRetry: "Simplify the regex pattern or use list_files + read_file as fallback",
        stopCondition: "ripgrep is not installed on this system"
      },
      inputSchema: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string" },
          maxResults: { type: "number" }
        },
        required: ["pattern"],
        additionalProperties: false
      },
      execute: async ({ pattern, path: targetPath = ".", maxResults = 50 }) => {
        const absolute = resolveWorkspacePath(config, targetPath);
        try {
          const { stdout } = await execFileAsync("rg", [
            "--line-number",
            "--color",
            "never",
            "--max-count",
            String(maxResults),
            pattern,
            absolute
          ]);
          const trimmed = stdout.trim();
          return wrapSuccess(trimmed, {
            summary: trimmed
              ? `Found matches for "${pattern}" in ${targetPath} (showing ${trimmed.split("\n").length} of up to ${maxResults} lines)`
              : `No matches found for "${pattern}" in ${targetPath}`,
            next_actions: trimmed
              ? [`read_file(...) to inspect matching lines`]
              : undefined
          });
        } catch (error) {
          if (error && typeof error === "object" && "stdout" in error) {
            const trimmed = String(error.stdout || "").trim();
            return wrapSuccess(trimmed, {
              summary: trimmed
                ? `Found matches for "${pattern}" (showing ${trimmed.split("\n").length} lines)`
                : `No matches found for "${pattern}" in ${targetPath}`
            });
          }
          throw error;
        }
      }
    },
    {
      name: "write_file",
      description: "Write a file relative to the project root, creating parent directories when needed.",
      riskLevel: "caution",
      granularity: "micro",
      errorRecovery: {
        rootCauseHint: "Parent directory not writable, disk full, or path outside workspace",
        safeRetry: "Verify the target directory is writable or use a different path",
        stopCondition: "Disk is full or path is permanently unwritable"
      },
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"],
        additionalProperties: false
      },
      execute: async ({ path: targetPath, content }) => {
        const absolute = resolveWorkspacePath(config, targetPath);
        await fs.mkdir(path.dirname(absolute), { recursive: true });
        await fs.writeFile(absolute, content, "utf8");
        return wrapSuccess(targetPath, {
          summary: `Wrote ${targetPath} (${content.length} chars)`,
          artifacts: [targetPath]
        });
      }
    },
    {
      name: "apply_patch",
      description: "Apply a simple search/replace patch inside one file.",
      riskLevel: "caution",
      granularity: "micro",
      errorRecovery: {
        rootCauseHint: "Search text not found in file, or file has been modified since last read",
        safeRetry: "Re-read the file to get current content, then retry with the exact search text",
        stopCondition: "Search text truly does not exist in the file after re-reading"
      },
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          search: { type: "string" },
          replace: { type: "string" },
          all: { type: "boolean" }
        },
        required: ["path", "search", "replace"],
        additionalProperties: false
      },
      execute: async ({ path: targetPath, search, replace, all = false }) => {
        const absolute = resolveWorkspacePath(config, targetPath);
        const raw = await fs.readFile(absolute, "utf8");
        if (!raw.includes(search)) {
          throw new Error(`Search text not found in ${targetPath}`);
        }
        const next = all ? raw.split(search).join(replace) : raw.replace(search, replace);
        await fs.writeFile(absolute, next, "utf8");
        return wrapSuccess(targetPath, {
          summary: `Patched ${targetPath} (${all ? "all" : "first"} occurrence${all ? "s" : ""})`,
          artifacts: [targetPath]
        });
      }
    }
  ];
}

async function walk(root, currentDir, output, limit) {
  if (output.length >= limit) {
    return;
  }
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".coding-agent" || entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const absolute = path.join(currentDir, entry.name);
    const relative = path.relative(root, absolute) || ".";
    output.push(relative);
    if (output.length >= limit) {
      return;
    }
    if (entry.isDirectory()) {
      await walk(root, absolute, output, limit);
    }
  }
}
