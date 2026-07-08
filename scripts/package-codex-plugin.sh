#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_DIR="${PROJECT_ROOT}/dist/code-agent-codex-plugin"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"
mkdir -p "${OUT_DIR}/.codex-plugin" "${OUT_DIR}/hooks" "${OUT_DIR}/skills" "${OUT_DIR}/docs"

cp "${PROJECT_ROOT}/.codex-plugin/plugin.json" "${OUT_DIR}/.codex-plugin/plugin.json"
cp "${PROJECT_ROOT}/hooks/hooks-codex.json" "${OUT_DIR}/hooks/hooks-codex.json"
cp "${PROJECT_ROOT}/hooks/session-start-codex" "${OUT_DIR}/hooks/session-start-codex"
cp -R "${PROJECT_ROOT}/skills/builtin" "${OUT_DIR}/skills/builtin"
if [ -d "${PROJECT_ROOT}/skills/repo" ]; then
  cp -R "${PROJECT_ROOT}/skills/repo" "${OUT_DIR}/skills/repo"
fi
cp "${PROJECT_ROOT}/README.md" "${OUT_DIR}/README.md"
cp "${PROJECT_ROOT}/CHANGELOG.md" "${OUT_DIR}/CHANGELOG.md"
cp "${PROJECT_ROOT}/docs/README.md" "${OUT_DIR}/docs/README.md"
cp "${PROJECT_ROOT}/docs/machine-state-api.md" "${OUT_DIR}/docs/machine-state-api.md"
cp "${PROJECT_ROOT}/docs/machine-state-schema.md" "${OUT_DIR}/docs/machine-state-schema.md"
cp "${PROJECT_ROOT}/docs/integration-guide.md" "${OUT_DIR}/docs/integration-guide.md"

cat > "${OUT_DIR}/bundle-summary.json" <<EOF
{
  "schemaVersion": "code-agent-bundle-summary.v1",
  "bundleType": "codex-plugin",
  "generatedBy": "scripts/package-codex-plugin.sh",
  "paths": {
    "pluginManifest": ".codex-plugin/plugin.json",
    "hooks": [
      "hooks/hooks-codex.json",
      "hooks/session-start-codex"
    ],
    "skills": [
      "skills/builtin"
    ],
    "docs": [
      "docs/README.md",
      "docs/machine-state-api.md",
      "docs/machine-state-schema.md",
      "docs/integration-guide.md"
    ]
  }
}
EOF

printf 'Packaged Codex plugin bundle at %s\n' "${OUT_DIR}"
