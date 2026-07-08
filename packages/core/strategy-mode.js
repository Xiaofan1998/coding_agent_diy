export const STRATEGY_PROFILES = {
  balanced: {
    mode: "balanced",
    maxToolRisk: "caution",
    subagentMaxToolRisk: "caution",
    autoRunDeliveryWorkflow: false,
    enforceSuggestedFirstTool: false
  },
  conservative: {
    mode: "conservative",
    maxToolRisk: "safe",
    subagentMaxToolRisk: "safe",
    autoRunDeliveryWorkflow: false,
    enforceSuggestedFirstTool: true
  },
  autonomous: {
    mode: "autonomous",
    maxToolRisk: "restricted",
    subagentMaxToolRisk: "caution",
    autoRunDeliveryWorkflow: true,
    enforceSuggestedFirstTool: false
  }
};

export function resolveStrategyProfile(mode = "") {
  return STRATEGY_PROFILES[mode] || STRATEGY_PROFILES.balanced;
}
