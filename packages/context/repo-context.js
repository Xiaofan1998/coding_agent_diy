import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_SOURCE_FILE_INDEX = 600;
const MAX_RELEVANT_FILES = 8;
const MAX_SNIPPET_BYTES = 14000;
const MAX_FILE_SNIPPET_LINES = 20;

export async function buildRepoSnapshot(configOrProjectRoot, options = {}) {
  const resolved = normalizeRepoContextConfig(configOrProjectRoot);
  const { projectRoot, workspaceRoots } = resolved;
  const { query = "", goal = null, activatedSkills = [] } = options;
  const snapshot = {
    projectRoot,
    workspaceRoots,
    files: [],
    importantFiles: [],
    isGitRepo: false,
    gitStatusSummary: "",
    sourceFiles: [],
    contextBudget: {
      maxRelevantFiles: MAX_RELEVANT_FILES,
      maxSnippetBytes: MAX_SNIPPET_BYTES,
      maxSourceFileIndex: MAX_SOURCE_FILE_INDEX
    },
    relevantFiles: [],
    relevantContext: [],
    relevantContextSummary: "(none)"
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
  sourceRecords.push(...await collectExplicitPathRecords({
    query,
    projectRoot,
    workspaceRoots,
    existingRecords: sourceRecords
  }));
  snapshot.sourceFiles = sourceRecords.map((record) => record.displayPath);

  const gitInfo = await readGitInfo(projectRoot);
  snapshot.isGitRepo = gitInfo.isGitRepo;
  snapshot.gitStatusSummary = gitInfo.status;

  const relevant = await selectRelevantContext({
    projectRoot,
    query,
    goal,
    activatedSkills,
    sourceRecords,
    topLevelFiles: snapshot.files,
    importantFiles: snapshot.importantFiles
  });

  snapshot.relevantFiles = relevant.files;
  snapshot.relevantContext = relevant.context;
  snapshot.relevantContextSummary = relevant.summary;

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

async function collectExplicitPathRecords({ query, projectRoot, workspaceRoots, existingRecords }) {
  const candidates = extractPossiblePaths(query);
  const existingAbsolutePaths = new Set(existingRecords.map((record) => record.absolutePath));
  const records = [];

  for (const candidate of candidates) {
    const absolutePath = path.isAbsolute(candidate)
      ? path.resolve(candidate)
      : path.resolve(projectRoot, candidate);
    if (existingAbsolutePaths.has(absolutePath)) {
      continue;
    }
    const workspaceRoot = workspaceRoots.find((root) => isInsideRoot(root, absolutePath));
    if (!workspaceRoot || !isContextFile(absolutePath)) {
      continue;
    }
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) {
        continue;
      }
      const relativePath = path.relative(workspaceRoot, absolutePath);
      records.push({
        absolutePath,
        workspaceRoot,
        relativePath,
        displayPath: formatDisplayPath(projectRoot, workspaceRoot, relativePath),
        toolPath: workspaceRoot === projectRoot ? relativePath : absolutePath,
        fileName: path.basename(absolutePath)
      });
      existingAbsolutePaths.add(absolutePath);
    } catch {
      continue;
    }
  }

  return records;
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
    return { isGitRepo: true, status: trimmed };
  } catch {
    return { isGitRepo: false, status: "" };
  }
}

async function selectRelevantContext({ projectRoot, query, goal, activatedSkills, sourceRecords, topLevelFiles, importantFiles }) {
  const searchText = `${query}\n${goal?.objective || ""}\n${activatedSkills.map((skill) => `${skill.name} ${skill.description || ""}`).join("\n")}`;
  const queryTokens = tokenize(searchText);
  const explicitFileHints = extractExplicitFileHints(searchText, sourceRecords, topLevelFiles, importantFiles, activatedSkills);

  const scored = sourceRecords.map((record) => {
    return {
      ...record,
      score: scoreFile(record, queryTokens, explicitFileHints)
    };
  });

  const selectedFiles = scored
    .filter((record) => record.score > 0)
    .sort((a, b) => b.score - a.score || a.displayPath.localeCompare(b.displayPath))
    .slice(0, MAX_RELEVANT_FILES);

  if (selectedFiles.length === 0) {
    const defaults = sourceRecords
      .filter((record) => isDefaultRelevantFile(record.displayPath))
      .slice(0, 4);
    selectedFiles.push(...defaults);
  }

  const context = [];
  let totalBytes = 0;

  for (const file of selectedFiles) {
    const content = await safeReadFile(file.absolutePath);
    if (!content) {
      continue;
    }
    const snippet = buildSnippet(content);
    const byteLength = Buffer.byteLength(snippet, "utf8");
    if ((totalBytes + byteLength) > MAX_SNIPPET_BYTES && context.length > 0) {
      continue;
    }

    context.push({
      path: file.displayPath,
      toolPath: file.toolPath,
      score: file.score,
      snippet
    });
    totalBytes += byteLength;
  }

  return {
    files: selectedFiles.map((file) => file.displayPath),
    context,
    summary: context.length > 0
      ? context.map((item) => `${item.path} (score ${item.score})`).join(", ")
      : "(none)"
  };
}

function scoreFile(record, queryTokens, explicitFileHints) {
  let score = 0;
  const haystack = `${record.displayPath} ${record.relativePath} ${record.fileName} ${record.toolPath}`.toLowerCase();

  if (
    explicitFileHints.has(record.displayPath.toLowerCase()) ||
    explicitFileHints.has(record.relativePath.toLowerCase()) ||
    explicitFileHints.has(record.fileName.toLowerCase()) ||
    explicitFileHints.has(String(record.toolPath).toLowerCase())
  ) {
    score += 20;
  }

  for (const token of queryTokens) {
    if (!token) {
      continue;
    }
    if (haystack.includes(token)) {
      score += token.length >= 6 ? 4 : 2;
    }
  }

  if (record.displayPath.includes("README")) {
    score += 2;
  }
  if (/package\.json|apps\/cli|packages\/core|packages\/tools|packages\/skills|packages\/memory|packages\/subagents/i.test(record.displayPath)) {
    score += 2;
  }

  return score;
}

function extractExplicitFileHints(searchText, sourceRecords, topLevelFiles, importantFiles, activatedSkills) {
  const lower = searchText.toLowerCase();
  const hints = new Set();

  for (const record of sourceRecords) {
    const candidates = [record.displayPath, record.relativePath, record.fileName, String(record.toolPath)];
    for (const candidate of candidates) {
      if (candidate && lower.includes(candidate.toLowerCase())) {
        hints.add(candidate.toLowerCase());
      }
    }
  }

  for (const fileName of topLevelFiles) {
    if (lower.includes(fileName.toLowerCase())) {
      hints.add(fileName.toLowerCase());
    }
  }

  for (const absolutePath of importantFiles) {
    const baseName = path.basename(absolutePath).toLowerCase();
    if (lower.includes(baseName)) {
      hints.add(baseName);
    }
  }

  for (const skill of activatedSkills) {
    for (const file of skill.supportFiles || []) {
      if (lower.includes(file.relativePath.toLowerCase()) || lower.includes(file.fileName.toLowerCase())) {
        hints.add(file.relativePath.toLowerCase());
        hints.add(file.fileName.toLowerCase());
      }
    }
  }

  return hints;
}

function buildSnippet(content) {
  const lines = content.split("\n");
  const selected = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (/^(#|export |import |class |function |const |let |var |async |interface |type )/i.test(trimmed)) {
      selected.push(line);
    }
    if (selected.length >= MAX_FILE_SNIPPET_LINES) {
      break;
    }
  }

  if (selected.length === 0) {
    return lines.slice(0, MAX_FILE_SNIPPET_LINES).join("\n");
  }

  return selected.join("\n");
}

async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function tokenize(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5./_:-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function extractPossiblePaths(value) {
  const matches = String(value || "").match(/(?:\/|\.{1,2}\/)?[A-Za-z0-9_./-]+\.[A-Za-z0-9_]+/g) || [];
  return [...new Set(matches.map((item) => item.trim()))];
}

function shouldSkipPath(name) {
  return [".coding-agent", "node_modules", ".git", "dist"].includes(name);
}

function isContextFile(name) {
  return /\.(js|ts|md|json|mjs|cjs|tsx|jsx|py)$/i.test(name);
}

function isDefaultRelevantFile(relativePath) {
  return /README\.md$|package\.json$|apps\/cli\/|packages\/core\/|packages\/tools\/|packages\/skills\//i.test(relativePath);
}

function isInsideRoot(root, candidatePath) {
  const relative = path.relative(path.resolve(root), path.resolve(candidatePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function formatDisplayPath(projectRoot, workspaceRoot, relativePath) {
  if (workspaceRoot === projectRoot) {
    return relativePath;
  }
  return `${path.basename(workspaceRoot)}/${relativePath}`;
}
