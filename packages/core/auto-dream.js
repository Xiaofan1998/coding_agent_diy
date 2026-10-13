import fs from "node:fs/promises";
import path from "node:path";

const META_FILE = ".auto-dream.json";
const LOCK_FILE = ".auto-dream.lock";
const DEFAULT_MIN_HOURS = 24;
const DEFAULT_MIN_TURNS = 5;
const DEFAULT_MAX_TRANSCRIPT_TURNS = 12;
const SECTION_TITLES = ["user", "feedback", "project", "reference"];

export class AutoDreamManager {
  constructor({ config, stateStore, sessionMemoryManager }) {
    this.config = config;
    this.stateStore = stateStore;
    this.sessionMemoryManager = sessionMemoryManager;
    this.memoryDir = config.memoryDir;
    this.memoryPath = path.join(this.memoryDir, "MEMORY.md");
    this.metaPath = path.join(this.memoryDir, META_FILE);
    this.lockPath = path.join(this.memoryDir, LOCK_FILE);
  }

  async maybeRun({ emitEvent = async () => {}, createTrace = async () => {} } = {}) {
    if (!this.config.runtime.autoDreamEnabled) {
      return this.skip("disabled", { emitEvent, createTrace });
    }
    await fs.mkdir(this.memoryDir, { recursive: true });

    const metadata = await this.loadMetadata();
    const now = Date.now();
    const minHours = positiveNumber(this.config.runtime.autoDreamMinHours, DEFAULT_MIN_HOURS);
    const minTurns = positiveInteger(this.config.runtime.autoDreamMinTurns, DEFAULT_MIN_TURNS);
    const transcriptTurnCount = await this.stateStore.countTranscriptTurns();
    const turnsSinceLast = Math.max(0, transcriptTurnCount - Number(metadata.lastTranscriptTurnCount || 0));
    const lastAt = metadata.lastConsolidatedAt ? Date.parse(metadata.lastConsolidatedAt) : 0;
    const hoursSinceLast = lastAt > 0 ? (now - lastAt) / 3600000 : Infinity;

    if (hoursSinceLast < minHours) {
      return this.skip("time_gate", { emitEvent, createTrace, hoursSinceLast, minHours, turnsSinceLast, minTurns });
    }
    if (turnsSinceLast < minTurns) {
      return this.skip("turn_gate", { emitEvent, createTrace, hoursSinceLast, minHours, turnsSinceLast, minTurns });
    }
    if (await exists(this.lockPath)) {
      return this.skip("locked", { emitEvent, createTrace, hoursSinceLast, minHours, turnsSinceLast, minTurns });
    }

    await fs.writeFile(this.lockPath, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2));
    try {
      const result = await this.consolidate({ transcriptTurnCount, turnsSinceLast });
      const nextMetadata = {
        lastConsolidatedAt: new Date().toISOString(),
        lastTranscriptTurnCount: transcriptTurnCount,
        lastResult: result
      };
      await this.saveMetadata(nextMetadata);
      const event = {
        type: "auto_dream_ran",
        memoryPath: this.memoryPath,
        addedCount: result.addedCount,
        candidateCount: result.candidateCount,
        turnsSinceLast,
        transcriptTurnCount
      };
      await emitEvent(event);
      await createTrace({ kind: "auto_dream_ran", ...event });
      return { ran: true, ...result };
    } catch (error) {
      const event = {
        type: "auto_dream_error",
        error: error instanceof Error ? error.message : String(error),
        turnsSinceLast,
        transcriptTurnCount
      };
      await emitEvent(event);
      await createTrace({ kind: "auto_dream_error", ...event });
      return { ran: false, reason: "error", error: event.error };
    } finally {
      await fs.rm(this.lockPath, { force: true });
    }
  }

  async consolidate({ transcriptTurnCount, turnsSinceLast }) {
    const limit = positiveInteger(this.config.runtime.autoDreamTranscriptTurns, DEFAULT_MAX_TRANSCRIPT_TURNS);
    const turns = await this.stateStore.listTranscriptTurns(limit, "desc");
    const sessionMemory = this.sessionMemoryManager ? await this.sessionMemoryManager.loadSummary() : null;
    const candidates = extractMemoryCandidates({ turns, sessionMemory, config: this.config });
    const existing = await readFileOrEmpty(this.memoryPath);
    const unique = dedupeCandidates(candidates, existing);
    if (unique.length === 0) {
      return { addedCount: 0, candidateCount: candidates.length, transcriptTurnCount, turnsSinceLast };
    }
    const next = applyCandidatesToMemory(existing || renderEmptyMemory(), unique);
    await fs.writeFile(this.memoryPath, truncateMemory(next), "utf8");
    return {
      addedCount: unique.length,
      candidateCount: candidates.length,
      transcriptTurnCount,
      turnsSinceLast,
      sections: unique.reduce((acc, item) => ({ ...acc, [item.section]: (acc[item.section] || 0) + 1 }), {})
    };
  }

  async skip(reason, { emitEvent, createTrace, ...details }) {
    const event = { type: "auto_dream_skipped", reason, ...details };
    await createTrace({ kind: "auto_dream_skipped", ...event });
    if (this.config.runtime.debug) {
      await emitEvent(event);
    }
    return { ran: false, reason, ...details };
  }

  async loadMetadata() {
    try {
      return JSON.parse(await fs.readFile(this.metaPath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return { lastConsolidatedAt: null, lastTranscriptTurnCount: 0 };
      throw error;
    }
  }

  async saveMetadata(metadata) {
    await fs.mkdir(this.memoryDir, { recursive: true });
    await fs.writeFile(this.metaPath, JSON.stringify(metadata, null, 2));
  }
}

function extractMemoryCandidates({ turns, sessionMemory, config }) {
  const candidates = [];
  for (const turn of [...(turns || [])].reverse()) {
    const text = `${turn.userText || ""}\n${turn.assistantText || ""}`;
    candidates.push(...extractExplicitMemoryLines(text));
  }
  if (sessionMemory) {
    candidates.push(...extractExplicitMemoryLines(sessionMemory));
  }
  return candidates.slice(0, positiveInteger(config.runtime.autoDreamMaxCandidates, 12));
}

function extractExplicitMemoryLines(text) {
  const candidates = [];
  const normalized = String(text || "").split(/\r?\n|(?<=[。.!?])\s+/).map((line) => line.trim()).filter(Boolean);
  for (const line of normalized) {
    const lower = line.toLowerCase();
    if (/(remember|记住|记录|长期记忆|preference|prefer|偏好|习惯)/i.test(line)) {
      candidates.push({ section: "user", content: cleanupCandidate(line), tag: "auto-dream" });
      continue;
    }
    if (/(convention|约定|规范|rule|规则|应该|必须|不要|统一)/i.test(line)) {
      candidates.push({ section: "feedback", content: cleanupCandidate(line), tag: "auto-dream" });
      continue;
    }
    if (/(decision|decided|决定|结论|踩坑|gotcha|bug|修复|实现|机制|默认)/i.test(line)) {
      candidates.push({ section: "project", content: cleanupCandidate(line), tag: "auto-dream" });
      continue;
    }
    if (/(https?:\/\/|文档|reference|参考|路径|file:|docs\/)/i.test(line)) {
      candidates.push({ section: "reference", content: cleanupCandidate(line), tag: "auto-dream" });
    }
  }
  return candidates.filter((item) => item.content.length >= 12 && item.content.length <= 500);
}

function cleanupCandidate(line) {
  return String(line || "")
    .replace(/^(user|assistant|system|developer)\s*[:：-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeCandidates(candidates, existingMarkdown) {
  const existing = normalizeForDedupe(existingMarkdown);
  const seen = new Set();
  const unique = [];
  for (const candidate of candidates) {
    const key = normalizeForDedupe(candidate.content);
    if (!key || key.length < 8 || existing.includes(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

function applyCandidatesToMemory(markdown, candidates) {
  let next = ensureSections(markdown || renderEmptyMemory());
  for (const candidate of candidates) {
    next = appendToSection(next, candidate.section, renderBullet(candidate));
  }
  return next;
}

function appendToSection(markdown, section, bullet) {
  const heading = `## ${section}`;
  const start = markdown.indexOf(heading);
  if (start === -1) {
    return `${markdown.trimEnd()}\n\n${heading}\n\n${bullet}\n`;
  }
  const afterHeading = start + heading.length;
  const nextHeading = markdown.indexOf("\n## ", afterHeading);
  const before = markdown.slice(0, afterHeading);
  const body = markdown.slice(afterHeading, nextHeading === -1 ? markdown.length : nextHeading);
  const after = nextHeading === -1 ? "" : markdown.slice(nextHeading);
  const cleaned = body.split("\n").filter((line) => line.trim() !== "- (empty)").join("\n").trim();
  return `${before}\n\n${cleaned ? `${cleaned}\n${bullet}` : bullet}\n${after}`.replace(/\n{4,}/g, "\n\n\n");
}

function renderBullet(candidate) {
  return `- ${candidate.content} [${candidate.tag}] _(auto-dream ${new Date().toISOString()})_`;
}

function ensureSections(markdown) {
  let next = String(markdown || renderEmptyMemory()).trimEnd();
  for (const section of SECTION_TITLES) {
    if (!next.includes(`## ${section}`)) {
      next += `\n\n## ${section}\n\n- (empty)`;
    }
  }
  return `${next}\n`;
}

function renderEmptyMemory() {
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

function truncateMemory(markdown) {
  const max = 30000;
  const text = String(markdown || "");
  return text.length <= max ? text : `${text.slice(0, max)}\n\n> WARNING: MEMORY.md was truncated by auto-dream.`;
}

async function readFileOrEmpty(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeForDedupe(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "").slice(0, 220);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
