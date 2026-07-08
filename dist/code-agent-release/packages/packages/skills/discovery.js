import fs from "node:fs/promises";
import path from "node:path";

const SUPPORT_DIRECTORIES = ["references", "scripts", "assets"];
const MAX_EMBEDDED_SUPPORT_FILES = 6;
const MAX_EMBEDDED_SUPPORT_BYTES = 24000;

export class SkillDiscovery {
  constructor(config) {
    this.config = config;
  }

  async listSkills() {
    const builtIn = await this.loadSkillDirectory(this.config.builtInSkillDir, "built-in");
    const userGlobal = await this.loadSkillDirectory(this.config.userSkillDir, "user-global");
    const repoLocal = await this.loadSkillDirectory(this.config.repoSkillDir, "repo-local");
    const workspaceSkills = await this.loadWorkspaceSkillDirectories();
    return dedupeSkills([...workspaceSkills, ...repoLocal, ...userGlobal, ...builtIn]);
  }

  async readSkill(name) {
    const skill = (await this.listSkills()).find((entry) => entry.name === name);
    if (!skill) {
      return null;
    }

    return this.hydrateSkill(skill);
  }

  async loadSkillDirectory(baseDir, source) {
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      const skills = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillFile = path.join(baseDir, entry.name, "SKILL.md");
        try {
          const raw = await fs.readFile(skillFile, "utf8");
          const parsed = parseSkill(raw);
          const supportFiles = await collectSupportFiles(path.dirname(skillFile));
          skills.push({
            id: `${source}:${parsed.name}`,
            name: parsed.name,
            description: parsed.description,
            source,
            dir: path.dirname(skillFile),
            file: skillFile,
            tags: parsed.tags,
            references: parsed.references,
            content: raw,
            body: parsed.body,
            supportFiles,
            supportSummary: summarizeSupportFiles(supportFiles)
          });
        } catch (error) {
          if (error && typeof error === "object" && error.code === "ENOENT") {
            continue;
          }
          throw error;
        }
      }

      return skills;
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async loadWorkspaceSkillDirectories() {
    const workspaceRoots = this.config.workspaceRoots || [this.config.projectRoot];
    const candidateDirectories = [];

    for (const workspaceRoot of workspaceRoots) {
      candidateDirectories.push({
        dir: path.join(workspaceRoot, ".agents", "skills"),
        source: `workspace-agents:${path.basename(workspaceRoot)}`
      });
      candidateDirectories.push({
        dir: path.join(workspaceRoot, "skills"),
        source: `workspace:${path.basename(workspaceRoot)}`
      });
    }

    const loaded = await Promise.all(candidateDirectories.map((entry) => {
      return this.loadSkillDirectory(entry.dir, entry.source);
    }));

    return loaded.flat();
  }

  async matchSkills({ userMessage, goal }) {
    const skills = await this.listSkills();
    const query = `${userMessage}\n${goal?.objective || ""}`.toLowerCase();

    const matches = skills
      .map((skill) => ({
        ...skill,
        score: scoreSkill(skill, query)
      }))
      .filter((skill) => skill.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return Promise.all(matches.map((skill) => this.hydrateSkill(skill)));
  }

  async hydrateSkill(skill) {
    const supportFiles = skill.supportFiles || await collectSupportFiles(skill.dir);
    const embeddedSupportFiles = await loadEmbeddedSupportFiles({
      body: skill.body,
      supportFiles
    });

    return {
      ...skill,
      supportFiles,
      embeddedSupportFiles,
      supportSummary: summarizeSupportFiles(supportFiles)
    };
  }
}

function parseSkill(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid SKILL.md frontmatter.");
  }

  const frontmatter = match[1];
  const body = match[2].trim();
  const metadata = {};
  for (const line of frontmatter.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...rest] = trimmed.split(":");
    metadata[key.trim()] = rest.join(":").trim().replace(/^"(.*)"$/, "$1");
  }

  return {
    name: metadata.name || "unnamed-skill",
    description: metadata.description || "",
    tags: parseList(metadata.tags),
    references: parseList(metadata.references),
    body
  };
}

function scoreSkill(skill, query) {
  let score = 0;
  const tokens = `${skill.name} ${skill.description} ${(skill.tags || []).join(" ")}`.toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5-]+/);
  for (const token of tokens) {
    if (token && query.includes(token)) {
      score += token.length >= 6 ? 3 : 1;
    }
  }
  if (query.includes(skill.name.toLowerCase())) {
    score += 10;
  }
  return score;
}

function parseList(value = "") {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeSkills(skills) {
  const seen = new Set();
  const output = [];
  for (const skill of skills) {
    if (seen.has(skill.name)) {
      continue;
    }
    seen.add(skill.name);
    output.push(skill);
  }
  return output;
}

async function collectSupportFiles(skillDir) {
  const output = [];

  for (const kind of SUPPORT_DIRECTORIES) {
    const absoluteDir = path.join(skillDir, kind);
    await walkSupportDirectory(skillDir, absoluteDir, kind, output);
  }

  return output.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function walkSupportDirectory(skillDir, currentDir, kind, output) {
  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walkSupportDirectory(skillDir, absolutePath, kind, output);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const stat = await fs.stat(absolutePath);
      output.push({
        kind,
        absolutePath,
        relativePath: path.relative(skillDir, absolutePath),
        fileName: entry.name,
        size: stat.size,
        isText: isTextLikeFile(entry.name)
      });
    }
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function loadEmbeddedSupportFiles({ body, supportFiles }) {
  const selected = [];
  let totalBytes = 0;

  for (const file of selectSupportFiles(body, supportFiles)) {
    if (!file.isText || selected.length >= MAX_EMBEDDED_SUPPORT_FILES) {
      continue;
    }
    if ((totalBytes + file.size) > MAX_EMBEDDED_SUPPORT_BYTES) {
      continue;
    }

    const content = await fs.readFile(file.absolutePath, "utf8");
    selected.push({
      kind: file.kind,
      relativePath: file.relativePath,
      size: file.size,
      content
    });
    totalBytes += file.size;
  }

  return selected;
}

function selectSupportFiles(body, supportFiles) {
  const lowerBody = body.toLowerCase();
  const directMatches = supportFiles.filter((file) => {
    return lowerBody.includes(file.relativePath.toLowerCase()) || lowerBody.includes(file.fileName.toLowerCase());
  });

  if (directMatches.length > 0) {
    return directMatches;
  }

  return supportFiles.filter((file) => {
    return file.kind !== "assets";
  }).slice(0, MAX_EMBEDDED_SUPPORT_FILES);
}

function summarizeSupportFiles(supportFiles) {
  const summary = {
    references: 0,
    scripts: 0,
    assets: 0
  };

  for (const file of supportFiles) {
    if (summary[file.kind] !== undefined) {
      summary[file.kind] += 1;
    }
  }

  return summary;
}

function isTextLikeFile(fileName) {
  return /\.(md|txt|json|ya?ml|js|ts|sh|py|mjs|cjs|tsx|jsx|css|html)$/i.test(fileName);
}
