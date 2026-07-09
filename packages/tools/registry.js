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

export function wrapError(error, { summary, next_actions } = {}) {
  return toolResponse({ status: "error", summary: summary || (error instanceof Error ? error.message : String(error)), data: null, next_actions });
}

export class ToolRegistry {
  constructor(tools) {
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
  }

  list() {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      riskLevel: tool.riskLevel,
      requiresConfirmation: tool.requiresConfirmation || false,
      granularity: tool.granularity || "medium",
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
