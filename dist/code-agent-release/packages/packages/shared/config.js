import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { normalizeFilesystemAccessMode, parseAllowedPaths, parseWorkspaceRoots } from "./workspace-roots.js";

const PROCESS_SESSION_STARTED_AT = new Date();
const PROCESS_SESSION_ID = createStartupSessionId(PROCESS_SESSION_STARTED_AT);
const DEFAULT_API_HOST = "https://openproxy.zuoyebang.cc";
const DEFAULT_API_KEY = "zyb-d95bddf9d719830eae81269beb6ef0e2@nlp";
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));


export function loadConfig(projectRoot) {
  const root = path.resolve(projectRoot);
  const agentRoot = resolveAgentRoot(root);
  const envInfo = loadProjectEnv(root);
  const defaultApiDisabled = process.env.CODE_AGENT_DISABLE_DEFAULT_API_KEY === "1";
  const apiHost = (process.env.API_HOST || (defaultApiDisabled ? "" : DEFAULT_API_HOST)).replace(/\/$/, "");
  const openAiBaseUrl = apiHost
    ? `${apiHost}/openproxy/rp/v1`
    : "https://api.openai.com/v1";
  const apiKey = process.env.API_KEY || (defaultApiDisabled ? "" : DEFAULT_API_KEY);
  const maxContextTokens = Number(process.env.CODE_AGENT_MAX_CONTEXT_TOKENS || process.env.OPENAI_MAX_TOKENS || 800000);
  const maxContextChars = Number(process.env.CODE_AGENT_MAX_CONTEXT_CHARS || 0) || Math.floor(maxContextTokens * 4);
  const artifactRootDir = process.env.CODE_AGENT_ARTIFACTS_DIR
    ? path.resolve(process.env.CODE_AGENT_ARTIFACTS_DIR)
    : path.join(root, "docs");
  const stateDir = process.env.CODE_AGENT_HOME
    ? path.resolve(process.env.CODE_AGENT_HOME)
    : path.join(root, ".coding-agent");
  const memoryRootDir = process.env.CODE_AGENT_MEMORY_DIR
    ? path.resolve(process.env.CODE_AGENT_MEMORY_DIR)
    : path.join(stateDir, "memory");
  const memoryDir = path.join(memoryRootDir, escapeProjectPath(root));
  const sessionId = process.env.CODE_AGENT_SESSION_ID || PROCESS_SESSION_ID;
  const sessionMemoryDir = path.join(stateDir, "sessions", sessionId, "session-memory");
  const userSkillDir = process.env.CODE_AGENT_USER_SKILL_DIR
    ? path.resolve(process.env.CODE_AGENT_USER_SKILL_DIR)
    : path.join(os.homedir(), ".code-agent", "skills");
  const workspaceRoots = parseWorkspaceRoots(root, process.env.CODE_AGENT_WORKSPACE_ROOTS || "");
  const allowPaths = parseAllowedPaths(process.env.CODE_AGENT_ALLOW_PATHS || "");

  return {
    projectRoot: root,
    agentRoot,
    workspaceRoots,
    allowPaths,
    artifactRootDir,
    stateDir,
    memoryDir,
    sessionMemoryDir,
    sessionId,
    promptDir: resolvePromptDir(agentRoot),
    builtInSkillDir: resolveBuiltInSkillDir(agentRoot),
    repoSkillDir: path.join(root, "skills", "repo"),
    userSkillDir,
    openai: {
      apiKey,
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      baseUrl: openAiBaseUrl,
      timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 30000),
      maxRetries: Number(process.env.OPENAI_MAX_RETRIES || 2),
      maxTokens: maxContextTokens,
      maxCompletionTokens: Number(process.env.OPENAI_MAX_COMPLETION_TOKENS || 32000),
      mockMode: process.env.CODE_AGENT_MOCK_MODEL === "1"
    },
    runtime: {
      hostName: os.hostname(),
      // Deprecated as a primary termination control. `0` means unlimited and
      // loop shutdown is handled by progress/stall detection instead.
      maxStepsPerTurn: Number(process.env.CODE_AGENT_MAX_STEPS_PER_TURN || 0),
      maxRepeatedToolCallStreak: Number(process.env.CODE_AGENT_MAX_REPEATED_TOOL_CALL_STREAK || 4),
      maxToolOutputChars: 12000,
      maxPromptChars: 32000,
      maxContextTokens,
      maxContextChars,
      autoCompactEnabled: process.env.CODE_AGENT_AUTO_COMPACT !== "0",
      autoCompactBufferTokens: Number(process.env.CODE_AGENT_AUTO_COMPACT_BUFFER_TOKENS || 13000),
      contextCompactThresholdRatio: Number(process.env.CODE_AGENT_CONTEXT_COMPACT_THRESHOLD || 0.9),
      contextCompactKeepRecentMessages: Number(process.env.CODE_AGENT_CONTEXT_COMPACT_KEEP_RECENT || 10),
      maxCompactedContextChars: Number(process.env.CODE_AGENT_MAX_COMPACTED_CONTEXT_CHARS || 6000),
      maxCompactedMessageChars: Number(process.env.CODE_AGENT_MAX_COMPACTED_MESSAGE_CHARS || 4000),
      sessionMemoryEnabled: process.env.CODE_AGENT_SESSION_MEMORY !== "0",
      sessionMemoryInitTokens: Number(process.env.CODE_AGENT_SESSION_MEMORY_INIT_TOKENS || 10000),
      sessionMemoryUpdateTokens: Number(process.env.CODE_AGENT_SESSION_MEMORY_UPDATE_TOKENS || 5000),
      sessionMemoryToolCallThreshold: Number(process.env.CODE_AGENT_SESSION_MEMORY_TOOL_CALLS || 3),
      sessionMemoryMaxSummaryChars: Number(process.env.CODE_AGENT_SESSION_MEMORY_MAX_SUMMARY_CHARS || 12000),
      maxRepoContextChars: 12000,
      maxDashboardSummaryChars: 5000,
      maxSkillContextChars: 12000,
      maxToolRisk: process.env.CODE_AGENT_MAX_TOOL_RISK || "caution",
      subagentMaxToolRisk: process.env.CODE_AGENT_SUBAGENT_MAX_TOOL_RISK || "caution",
      requireConfirmationForWrite: process.env.CODE_AGENT_REQUIRE_CONFIRM_WRITE === "1",
      requireConfirmationForRestricted: process.env.CODE_AGENT_REQUIRE_CONFIRM_RESTRICTED !== "0",
      autoRunDeliveryWorkflow: process.env.CODE_AGENT_AUTO_WORKFLOW === "1",
      enforceSuggestedFirstTool: process.env.CODE_AGENT_ENFORCE_SUGGESTED_FIRST_TOOL === "1",
      debug: process.env.CODE_AGENT_DEBUG === "1",
      filesystemAccessMode: normalizeFilesystemAccessMode(process.env.CODE_AGENT_FILESYSTEM_ACCESS_MODE || process.env.CODE_AGENT_ACCESS_MODE || "request-access")
    },
    web: {
      searchEndpoint: process.env.CODE_AGENT_WEB_SEARCH_ENDPOINT || "https://html.duckduckgo.com/html/",
      timeoutMs: Number(process.env.CODE_AGENT_WEB_TIMEOUT_MS || 15000),
      maxFetchChars: Number(process.env.CODE_AGENT_WEB_MAX_FETCH_CHARS || 12000)
    },
    env: envInfo
  };
}

function resolveAgentRoot(projectRoot) {
  if (process.env.CODE_AGENT_INSTALL_ROOT) {
    return path.resolve(process.env.CODE_AGENT_INSTALL_ROOT);
  }

  const sourceRoot = path.resolve(MODULE_DIR, "..", "..");
  if (fs.existsSync(path.join(sourceRoot, "prompts", "base.md"))) {
    return sourceRoot;
  }

  const releaseRoot = path.resolve(MODULE_DIR, "..", "..", "..");
  if (fs.existsSync(path.join(releaseRoot, "prompts", "base.md"))) {
    return releaseRoot;
  }

  if (fs.existsSync(path.join(projectRoot, "prompts", "base.md"))) {
    return projectRoot;
  }

  return sourceRoot;
}

function resolvePromptDir(agentRoot) {
  const direct = path.join(agentRoot, "prompts");
  if (fs.existsSync(path.join(direct, "base.md"))) {
    return direct;
  }
  const packaged = path.join(agentRoot, "prompts", "prompts");
  if (fs.existsSync(path.join(packaged, "base.md"))) {
    return packaged;
  }
  return direct;
}

function resolveBuiltInSkillDir(agentRoot) {
  const direct = path.join(agentRoot, "skills", "builtin");
  if (fs.existsSync(direct)) {
    return direct;
  }
  const packaged = path.join(agentRoot, "skills", "skills", "builtin");
  if (fs.existsSync(packaged)) {
    return packaged;
  }
  return direct;
}

function createStartupSessionId(startedAt) {
  const timestamp = startedAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `session_${timestamp}_${crypto.randomUUID().slice(0, 8)}`;
}

function loadProjectEnv(projectRoot) {
  if (process.env.CODE_AGENT_DISABLE_DOTENV === "1") {
    return {
      path: path.join(projectRoot, ".env"),
      loaded: false,
      loadedKeys: [],
      skipped: true
    };
  }

  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    return {
      path: envPath,
      loaded: false,
      loadedKeys: []
    };
  }

  const raw = fs.readFileSync(envPath, "utf8");
  const loadedKeys = [];

  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }
    const { key, value } = parsed;
    if (shouldOverrideEnvKey(key) || process.env[key] === undefined) {
      process.env[key] = value;
      loadedKeys.push(key);
    }
  }

  return {
    path: envPath,
    loaded: true,
    loadedKeys
  };
}

function escapeProjectPath(projectRoot) {
  return String(projectRoot || "project")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "project";
}

function shouldOverrideEnvKey(key) {
  return key === "API_HOST"
    || key === "API_KEY"
    || key === "OPENAI_MODEL"
    || key === "OPENAI_TIMEOUT_MS"
    || key === "OPENAI_MAX_RETRIES"
    || key === "CODE_AGENT_SESSION_ID"
    || key.startsWith("CODE_AGENT_");
}

function parseEnvLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const normalized = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trim()
    : trimmed;
  const separatorIndex = normalized.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();
  let value = normalized.slice(separatorIndex + 1).trim();
  if (!key) {
    return null;
  }

  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (isQuoted) {
    value = value.slice(1, -1);
  } else {
    const commentIndex = value.indexOf(" #");
    if (commentIndex >= 0) {
      value = value.slice(0, commentIndex).trim();
    }
  }

  value = expandEnvReferences(value);

  return { key, value };
}

function expandEnvReferences(value) {
  return String(value || "").replace(/\$\{([A-Z0-9_]+)\}/gi, (_, key) => {
    return process.env[key] ?? "";
  });
}
