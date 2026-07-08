import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath } from "../shared/workspace-roots.js";

const execFileAsync = promisify(execFile);

export function createFileTools(config) {
  return [
    {
      name: "list_files",
      description: "List files under a directory relative to the project root.",
      riskLevel: "safe",
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
        return output;
      }
    },
    {
      name: "read_file",
      description: "Read a file from the project root and optionally limit the line range.",
      riskLevel: "safe",
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
        return lines.slice(startLine - 1, endLine).join("\n");
      }
    },
    {
      name: "search_files",
      description: "Search for a text pattern in project files using ripgrep when available.",
      riskLevel: "safe",
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
          return stdout.trim();
        } catch (error) {
          if (error && typeof error === "object" && "stdout" in error) {
            return String(error.stdout || "").trim();
          }
          throw error;
        }
      }
    },
    {
      name: "write_file",
      description: "Write a file relative to the project root, creating parent directories when needed.",
      riskLevel: "caution",
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
        return `Wrote ${targetPath}`;
      }
    },
    {
      name: "apply_patch",
      description: "Apply a simple search/replace patch inside one file.",
      riskLevel: "caution",
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
        return `Patched ${targetPath}`;
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
