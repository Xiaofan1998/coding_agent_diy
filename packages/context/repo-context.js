import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_SOURCE_FILE_INDEX = 600;

export async function buildRepoSnapshot(configOrProjectRoot) {
  const resolved = normalizeRepoContextConfig(configOrProjectRoot);
  const { projectRoot, workspaceRoots } = resolved;
  const snapshot = {
    projectRoot,
    workspaceRoots,
    files: [],
    importantFiles: [],
    isGitRepo: false,
    gitStatusSummary: "",
    sourceFiles: [],
    contextBudget: {
      maxSourceFileIndex: MAX_SOURCE_FILE_INDEX
    }
  };

  const topLevel = await safeReadDir(projectRoot);
  snapshot.files = topLevel.map((entry) => entry.name);
  snapshot.importantFiles = topLevel
    .filter((entry) => {
      return ["package.json", "README.md", "tsconfig.json", "src", "apps", "packages", "skills", "docs"].includes(entry.name);
    })
    .map((entry) => path.join(projectRoot, entry.name));

  const sourceRecords = [];
  const perRootLimit = Math.max(40, Math.floor(MAX_SOURCE_FILE_INDEX / Math.max(1, workspaceRoots.length)));
  for (const root of workspaceRoots) {
    const beforeCount = sourceRecords.length;
    await walkSource({
      workspaceRoot: root,
      currentDir: root,
      output: sourceRecords,
      limit: beforeCount + perRootLimit,
      projectRoot
    });
    if (sourceRecords.length >= MAX_SOURCE_FILE_INDEX) {
      break;
    }
  }
  snapshot.sourceFiles = sourceRecords.map((record) => record.displayPath);

  const gitInfo = await readGitInfo(projectRoot);
  snapshot.isGitRepo = gitInfo.isGitRepo;
  snapshot.gitStatusSummary = gitInfo.status;

  return snapshot;
}

function normalizeRepoContextConfig(configOrProjectRoot) {
  if (typeof configOrProjectRoot === "string") {
    const projectRoot = path.resolve(configOrProjectRoot);
    return {
      projectRoot,
      workspaceRoots: [projectRoot]
    };
  }

  const projectRoot = path.resolve(configOrProjectRoot.projectRoot);
  const workspaceRoots = (configOrProjectRoot.workspaceRoots || [projectRoot]).map((root) => path.resolve(root));
  return {
    projectRoot,
    workspaceRoots: [...new Set(workspaceRoots)]
  };
}

async function safeReadDir(dirPath) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function walkSource({ workspaceRoot, currentDir, output, limit, projectRoot }) {
  if (output.length >= limit) {
    return;
  }
  const entries = await safeReadDir(currentDir);
  for (const entry of entries) {
    if (shouldSkipPath(entry.name)) {
      continue;
    }
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkSource({
        workspaceRoot,
        currentDir: absolute,
        output,
        limit,
        projectRoot
      });
    } else if (entry.isFile() && isContextFile(entry.name)) {
      const relativePath = path.relative(workspaceRoot, absolute);
      output.push({
        absolutePath: absolute,
        workspaceRoot,
        relativePath,
        displayPath: formatDisplayPath(projectRoot, workspaceRoot, relativePath),
        toolPath: workspaceRoot === projectRoot ? relativePath : absolute,
        fileName: entry.name
      });
      if (output.length >= limit) {
        return;
      }
    }
  }
}

async function readGitInfo(projectRoot) {
  try {
    const { stdout } = await execFileAsync(
      "zsh",
      ["-lc", "git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git status --short || echo '__NOT_GIT__'"],
      { cwd: projectRoot }
    );
    const trimmed = stdout.trim();
    if (trimmed === "__NOT_GIT__") {
      return { isGitRepo: false, status: "" };
    }
    return { isGitRepo: true, status: summarizeGitStatus(trimmed) };
  } catch {
    return { isGitRepo: false, status: "" };
  }
}

export function summarizeGitStatus(statusText, { maxLines = 20, maxChars = 3000 } = {}) {
  const lines = String(statusText || "").trim().split("\n").filter(Boolean);
  if (lines.length === 0) {
    return "";
  }
  const counts = { added: 0, modified: 0, deleted: 0, renamed: 0, untracked: 0, other: 0 };
  for (const line of lines) {
    const code = line.slice(0, 2);
    if (code === "??") counts.untracked += 1;
    else if (code.includes("D")) counts.deleted += 1;
    else if (code.includes("A")) counts.added += 1;
    else if (code.includes("M")) counts.modified += 1;
    else if (code.includes("R")) counts.renamed += 1;
    else counts.other += 1;
  }
  const summary = `total=${lines.length}, added=${counts.added}, modified=${counts.modified}, deleted=${counts.deleted}, renamed=${counts.renamed}, untracked=${counts.untracked}, other=${counts.other}`;
  let preview = lines.slice(0, maxLines).join("\n");
  if (preview.length > maxChars) {
    preview = `${preview.slice(0, maxChars)}\n... git status preview truncated by character limit`;
  }
  const omitted = Math.max(0, lines.length - maxLines);
  return [
    summary,
    preview,
    omitted > 0 ? `... ${omitted} more git status line(s) omitted` : ""
  ].filter(Boolean).join("\n");
}

function shouldSkipPath(name) {
  return [
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".cache",
    "coverage",
    ".coding-agent"
  ].includes(name);
}

function isContextFile(fileNameOrPath) {
  return /\.(js|mjs|cjs|ts|tsx|jsx|json|md|py|sh|yaml|yml|toml|css|html)$/i.test(fileNameOrPath);
}

function formatDisplayPath(projectRoot, workspaceRoot, relativePath) {
  if (workspaceRoot === projectRoot) {
    return relativePath || ".";
  }
  return path.join(workspaceRoot, relativePath);
}
