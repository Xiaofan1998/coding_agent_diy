const RISK_ORDER = {
  safe: 0,
  caution: 1,
  restricted: 2,
  forbidden: 3
};

export class ToolPolicyError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ToolPolicyError";
    this.details = details;
  }
}

export function getEffectiveToolPolicy(config, { isSubagent = false } = {}) {
  return {
    maxRiskLevel: isSubagent
      ? config.runtime.subagentMaxToolRisk
      : config.runtime.maxToolRisk,
    requireConfirmationForWrite: config.runtime.requireConfirmationForWrite,
    requireConfirmationForRestricted: config.runtime.requireConfirmationForRestricted
  };
}

export function assertToolAllowed(tool, policy) {
  const toolRisk = tool.riskLevel || "safe";
  const maxRisk = policy.maxRiskLevel || "caution";

  if (!isRiskAllowed(toolRisk, maxRisk)) {
    throw new ToolPolicyError(
      `Tool "${tool.name}" is blocked by policy: risk ${toolRisk} exceeds allowed maximum ${maxRisk}.`,
      {
        toolName: tool.name,
        toolRisk,
        maxRisk,
        policyReason: "risk_threshold"
      }
    );
  }

  if (toolRisk === "forbidden") {
    throw new ToolPolicyError(
      `Tool "${tool.name}" is forbidden by runtime policy.`,
      {
        toolName: tool.name,
        toolRisk,
        maxRisk,
        policyReason: "forbidden_tool"
      }
    );
  }
}

export function isRiskAllowed(toolRisk, maxRisk) {
  return normalizeRiskRank(toolRisk) <= normalizeRiskRank(maxRisk);
}

function normalizeRiskRank(risk) {
  return RISK_ORDER[risk] ?? RISK_ORDER.safe;
}
