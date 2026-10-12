/**
 * Standardized tool response schema (per agent-harness-construction skill):
 *
 *   {
 *     status: "success" | "warning" | "error",
 *     summary: "one-line result description",
 *     data: <raw result>,
 *     next_actions: ["action1", "action2"],   // optional
 *     artifacts: ["path/to/file"]              // optional
 *   }
 */

function toolResponse({ status, summary, data, next_actions, artifacts }) {
  const response = { status, summary };
  if (data !== undefined) response.data = data;
  if (next_actions && next_actions.length > 0) response.next_actions = next_actions;
  if (artifacts && artifacts.length > 0) response.artifacts = artifacts;
  return response;
}

export function wrapSuccess(data, { summary, next_actions, artifacts } = {}) {
  return toolResponse({ status: "success", summary: summary || "ok", data, next_actions, artifacts });
}

export function wrapWarning(data, { summary, next_actions, artifacts } = {}) {
  return toolResponse({ status: "warning", summary: summary || "completed with warnings", data, next_actions, artifacts });
}

export function wrapError(error, { summary, data = null, next_actions } = {}) {
  return toolResponse({ status: "error", summary: summary || (error instanceof Error ? error.message : String(error)), data, next_actions });
}

export class ToolRegistry {
  constructor(tools) {
    this.tools = new Map(tools.map((tool) => [tool.name, withToolDefaults(tool)]));
  }

  list() {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      riskLevel: tool.riskLevel,
      requiresConfirmation: tool.requiresConfirmation || false,
      granularity: tool.granularity || "medium",
      concurrencySafe: tool.concurrencySafeHint === true,
      concurrencyMode: tool.concurrencySafeHint === "dynamic" ? "dynamic" : (tool.concurrencySafeHint === true ? "safe" : "exclusive"),
      readOnly: tool.readOnlyHint === true,
      errorRecovery: tool.errorRecovery || null
    }));
  }

  get(name) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool;
  }
}

function withToolDefaults(tool) {
  const readOnlyHint = tool.readOnlyHint === true;
  const concurrencySafeHint = tool.concurrencySafeHint === "dynamic"
    ? "dynamic"
    : Boolean(tool.concurrencySafeHint || readOnlyHint);
  return {
    ...tool,
    readOnlyHint,
    concurrencySafeHint,
    isReadOnly: typeof tool.isReadOnly === "function"
      ? tool.isReadOnly
      : () => readOnlyHint,
    isConcurrencySafe: typeof tool.isConcurrencySafe === "function"
      ? tool.isConcurrencySafe
      : (args) => {
          if (typeof tool.isReadOnly === "function") {
            try {
              return Boolean(tool.isReadOnly(args));
            } catch {
              return false;
            }
          }
          return concurrencySafeHint === true;
        }
  };
}
