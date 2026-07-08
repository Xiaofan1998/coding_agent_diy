import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { parseAllowedPaths, parseWorkspaceRoots } from "./workspace-roots.js";

export function loadConfig(projectRoot) {
  const root = path.resolve(projectRoot);
  const envInfo = loadProjectEnv(root);
  const artifactRootDir = process.env.CODE_AGENT_ARTIFACTS_DIR
    ? path.resolve(process.env.CODE_AGENT_ARTIFACTS_DIR)
    : path.join(root, "docs");
  const stateDir = process.env.CODE_AGENT_HOME
    ? path.resolve(process.env.CODE_AGENT_HOME)
    : path.join(root, ".coding-agent");
  const userSkillDir = process.env.CODE_AGENT_USER_SKILL_DIR
    ? path.resolve(process.env.CODE_AGENT_USER_SKILL_DIR)
    : path.join(os.homedir(), ".code-agent", "skills");
  const workspaceRoots = parseWorkspaceRoots(root, process.env.CODE_AGENT_WORKSPACE_ROOTS || "");
  const allowPaths = parseAllowedPaths(process.env.CODE_AGENT_ALLOW_PATHS || "");

  return {
    projectRoot: root,
    workspaceRoots,
    allowPaths,
    artifactRootDir,
    stateDir,
    promptDir: path.join(root, "prompts"),
    builtInSkillDir: path.join(root, "skills", "builtin"),
    repoSkillDir: path.join(root, "skills", "repo"),
    userSkillDir,
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 30000),
      maxRetries: Number(process.env.OPENAI_MAX_RETRIES || 2),
      mockMode: process.env.CODE_AGENT_MOCK_MODEL === "1"
    },
    anthropic: {
      authToken: process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY || "",
      model: process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || "",
      baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
      timeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || 30000),
      maxRetries: Number(process.env.ANTHROPIC_MAX_RETRIES || process.env.OPENAI_MAX_RETRIES || 2),
      subagentModel: process.env.CLAUDE_CODE_SUBAGENT_MODEL || process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || ""
    },
    runtime: {
      hostName: os.hostname(),
      // Deprecated as a primary termination control. `0` means unlimited and
      // loop shutdown is handled by progress/stall detection instead.
      maxStepsPerTurn: Number(process.env.CODE_AGENT_MAX_STEPS_PER_TURN || 0),
      maxRepeatedToolCallStreak: Number(process.env.CODE_AGENT_MAX_REPEATED_TOOL_CALL_STREAK || 4),
      maxToolOutputChars: 12000,
      maxPromptChars: 32000,
      maxRepoContextChars: 12000,
      maxDashboardSummaryChars: 5000,
      maxSkillContextChars: 12000,
      maxToolRisk: process.env.CODE_AGENT_MAX_TOOL_RISK || "caution",
      subagentMaxToolRisk: process.env.CODE_AGENT_SUBAGENT_MAX_TOOL_RISK || "caution",
      requireConfirmationForWrite: process.env.CODE_AGENT_REQUIRE_CONFIRM_WRITE === "1",
      requireConfirmationForRestricted: process.env.CODE_AGENT_REQUIRE_CONFIRM_RESTRICTED !== "0",
      autoRunDeliveryWorkflow: process.env.CODE_AGENT_AUTO_WORKFLOW === "1",
      enforceSuggestedFirstTool: process.env.CODE_AGENT_ENFORCE_SUGGESTED_FIRST_TOOL === "1",
      debug: process.env.CODE_AGENT_DEBUG === "1"
    },
    web: {
      searchEndpoint: process.env.CODE_AGENT_WEB_SEARCH_ENDPOINT || "https://html.duckduckgo.com/html/",
      timeoutMs: Number(process.env.CODE_AGENT_WEB_TIMEOUT_MS || 15000),
      maxFetchChars: Number(process.env.CODE_AGENT_WEB_MAX_FETCH_CHARS || 12000)
    },
    env: envInfo
  };
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

function shouldOverrideEnvKey(key) {
  return key.startsWith("OPENAI_") || key.startsWith("ANTHROPIC_") || key.startsWith("CODE_AGENT_");
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
