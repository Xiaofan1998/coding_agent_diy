import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "../shared/fs-utils.js";

const ENTRYPOINT_FILE = "MEMORY.md";
const MAX_ENTRYPOINT_LINES = 300;
const MAX_ENTRYPOINT_CHARS = 30000;

const MEMORY_SECTIONS = [
  {
    key: "user",
    title: "user",
    aliases: ["user", "preference", "preferences", "用户偏好"]
  },
  {
    key: "feedback",
    title: "feedback",
    aliases: ["feedback", "preference", "preferences", "convention", "conventions", "用户偏好", "项目约定"]
  },
  {
    key: "project",
    title: "project",
    aliases: ["project", "deadline", "decision", "decisions", "incident", "initiative", "repo", "项目", "稳定决策", "踩坑"]
  },
  {
    key: "reference",
    title: "reference",
    aliases: ["reference", "external", "dashboard", "linear", "slack", "url", "link", "引用", "外部"]
  }
];

export class FileMemoryStore {
  constructor(config) {
    this.config = config;
    this.memoryDir = config.memoryDir;
    this.entrypointPath = path.join(this.memoryDir, ENTRYPOINT_FILE);
  }

  async ensureInitialized() {
    await ensureDir(this.memoryDir);
    try {
      await fs.access(this.entrypointPath);
    } catch {
      await fs.writeFile(this.entrypointPath, renderEmptyEntrypoint(), "utf8");
    }
  }

  async saveMemory({ scope, content, tags = [] }) {
    await this.ensureInitialized();
    const createdAt = new Date().toISOString();
    const section = selectSection(scope, tags, content);
    const record = {
      id: `memory_${Date.now()}`,
      createdAt,
      scope: section.key,
      content: String(content || "").trim(),
      tags,
      path: this.entrypointPath,
      relativePath: ENTRYPOINT_FILE,
      section: section.title,
      title: buildTitle(content, tags, section.title)
    };

    const current = await this.readEntrypoint({ truncate: false });
    const next = appendMemoryToSection(current || renderEmptyEntrypoint(), section.title, renderMemoryBullet(record));
    await fs.writeFile(this.entrypointPath, truncateEntrypoint(next), "utf8");
    return record;
  }

  async searchMemories(query = "") {
    await this.ensureInitialized();
    const lowered = String(query || "").toLowerCase();
    const records = parseEntrypointRecords(await this.readEntrypoint({ truncate: false }), this.entrypointPath);
    if (!lowered) {
      return records;
    }
    return records.filter((memory) => [
      memory.id,
      memory.scope,
      memory.section,
      memory.title,
      memory.content,
      ...(memory.tags || [])
    ].join("\n").toLowerCase().includes(lowered));
  }

  async buildPrompt() {
    await this.ensureInitialized();
    const entrypoint = await this.readEntrypoint();

    return [
      `Memory directory: ${this.memoryDir}`,
      `Project memory file: ${this.entrypointPath}`,
      "",
      "## MEMORY.md",
      entrypoint || "(empty)"
    ].join("\n");
  }

  async findRelevantMemories(query = "", { limit = 5, maxChars = 6000 } = {}) {
    await this.ensureInitialized();
    const records = parseEntrypointRecords(await this.readEntrypoint({ truncate: false }), this.entrypointPath);
    const tokens = tokenize(query);
    const scored = records
      .map((record, index) => ({
        ...record,
        score: scoreMemory(record, tokens),
        order: index
      }))
      .filter((record) => record.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, Math.max(0, limit));

    const selected = [];
    let used = 0;
    for (const record of scored) {
      const rendered = renderRelevantMemory(record);
      if (selected.length > 0 && used + rendered.length > maxChars) {
        continue;
      }
      selected.push(record);
      used += rendered.length;
    }
    return selected;
  }

  async readEntrypoint({ truncate = true } = {}) {
    try {
      const raw = await fs.readFile(this.entrypointPath, "utf8");
      return truncate ? truncateEntrypoint(raw) : raw;
    } catch {
      return "";
    }
  }
}

function renderEmptyEntrypoint() {
  return [
    "# Project Memory",
    "",
    "This file is the durable memory for this project. Keep entries concise, stable, and easy to edit by hand.",
    "",
    "## user",
    "",
    "- (empty)",
    "",
    "## feedback",
    "",
    "- (empty)",
    "",
    "## project",
    "",
    "- (empty)",
    "",
    "## reference",
    "",
    "- (empty)",
    ""
  ].join("\n");
}

function selectSection(scope, tags = [], content = "") {
  const haystack = [scope, ...(tags || []), content].join(" ").toLowerCase();
  for (const section of MEMORY_SECTIONS) {
    if (section.aliases.some((alias) => haystack.includes(alias.toLowerCase()))) {
      return section;
    }
  }
  return MEMORY_SECTIONS[2];
}

function appendMemoryToSection(markdown, sectionTitle, bullet) {
  const normalized = ensureSections(markdown || renderEmptyEntrypoint());
  const heading = `## ${sectionTitle}`;
  const start = normalized.indexOf(heading);
  if (start === -1) {
    return `${normalized.trim()}\n\n${heading}\n\n${bullet}\n`;
  }

  const afterHeading = start + heading.length;
  const nextHeading = normalized.indexOf("\n## ", afterHeading);
  const before = normalized.slice(0, afterHeading);
  const sectionBody = normalized.slice(afterHeading, nextHeading === -1 ? normalized.length : nextHeading);
  const after = nextHeading === -1 ? "" : normalized.slice(nextHeading);
  const cleanedBody = sectionBody
    .split("\n")
    .filter((line) => line.trim() !== "- (empty)")
    .join("\n")
    .trim();
  const nextBody = cleanedBody ? `${cleanedBody}\n${bullet}` : bullet;
  return `${before}\n\n${nextBody}\n${after}`.replace(/\n{4,}/g, "\n\n\n");
}

function ensureSections(markdown) {
  let next = markdown.trimEnd();
  for (const section of MEMORY_SECTIONS) {
    if (!next.includes(`## ${section.title}`)) {
      next += `\n\n## ${section.title}\n\n- (empty)`;
    }
  }
  return `${next}\n`;
}

function renderMemoryBullet(record) {
  const tags = record.tags?.length ? ` [${record.tags.join(", ")}]` : "";
  return `- ${singleLine(record.content)}${tags} _(saved ${record.createdAt})_`;
}

function parseEntrypointRecords(markdown, filePath) {
  const records = [];
  let currentSection = "Project Memory";
  for (const line of String(markdown || "").split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentSection = heading[1].trim();
      continue;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (!item || item[1].trim() === "(empty)") {
      continue;
    }
    const content = item[1].replace(/\s+_\(saved .*?\)_\s*$/, "").trim();
    records.push({
      id: `memory_${records.length + 1}`,
      createdAt: "",
      scope: sectionKeyForTitle(currentSection),
      section: currentSection,
      title: buildTitle(content, [], currentSection),
      content,
      tags: parseInlineTags(content),
      path: filePath,
      relativePath: ENTRYPOINT_FILE
    });
  }
  return records;
}

function sectionKeyForTitle(title) {
  return MEMORY_SECTIONS.find((section) => section.title === title)?.key || "project";
}

function parseInlineTags(content) {
  const match = content.match(/\[([^\]]+)\]\s*$/);
  if (!match) {
    return [];
  }
  return match[1].split(",").map((item) => item.trim()).filter(Boolean);
}


function scoreMemory(record, queryTokens) {
  if (!queryTokens || queryTokens.length === 0) {
    return 0;
  }
  const haystack = [
    record.section,
    record.scope,
    record.title,
    record.content,
    ...(record.tags || [])
  ].join(" ").toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (!token) continue;
    if (haystack.includes(token)) {
      score += token.length >= 5 ? 4 : 2;
    }
  }
  if (record.scope === "project") {
    score += 1;
  }
  if (record.scope === "feedback" || record.scope === "user") {
    score += 1;
  }
  return score;
}

function renderRelevantMemory(record) {
  const tags = record.tags?.length ? ` [${record.tags.join(", ")}]` : "";
  return `- (${record.section}) ${singleLine(record.content)}${tags}`;
}

function tokenize(value) {
  const text = String(value || "").toLowerCase();
  const tokens = text
    .split(/[^a-z0-9_\u4e00-\u9fa5-]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  return [...new Set(tokens)].slice(0, 80);
}

function buildTitle(content, tags, scope) {
  const firstLine = singleLine(content).slice(0, 48);
  if (firstLine) {
    return firstLine;
  }
  if (tags?.[0]) {
    return `${scope || "memory"} ${tags[0]}`;
  }
  return `${scope || "memory"} memory`;
}

function singleLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateEntrypoint(raw) {
  const lines = String(raw || "").trim().split("\n");
  let truncated = lines.slice(0, MAX_ENTRYPOINT_LINES).join("\n");
  if (truncated.length > MAX_ENTRYPOINT_CHARS) {
    truncated = truncated.slice(0, MAX_ENTRYPOINT_CHARS);
  }
  if (lines.length > MAX_ENTRYPOINT_LINES || String(raw || "").length > MAX_ENTRYPOINT_CHARS) {
    truncated += "\n\n> WARNING: MEMORY.md was truncated for prompt budget. Keep memory entries concise.";
  }
  return truncated;
}
