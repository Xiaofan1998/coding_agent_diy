export function parseJsonWithFences(text) {
  const trimmed = text.trim();
  const withoutFences = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  return JSON.parse(withoutFences);
}

export function stringifyCompact(value) {
  return JSON.stringify(value, null, 2);
}
