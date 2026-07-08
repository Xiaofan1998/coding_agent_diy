#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_DIR="${PROJECT_ROOT}/dist/code-agent-release"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

mkdir -p "${OUT_DIR}/apps" "${OUT_DIR}/bin" "${OUT_DIR}/docs" "${OUT_DIR}/packages" "${OUT_DIR}/prompts" "${OUT_DIR}/skills" "${OUT_DIR}/hooks" "${OUT_DIR}/scripts"

cp -R "${PROJECT_ROOT}/apps/cli" "${OUT_DIR}/apps/cli"
cp -R "${PROJECT_ROOT}/apps/demo" "${OUT_DIR}/apps/demo"
cp -R "${PROJECT_ROOT}/bin" "${OUT_DIR}/bin"
cp -R "${PROJECT_ROOT}/docs" "${OUT_DIR}/docs"
cp -R "${PROJECT_ROOT}/packages" "${OUT_DIR}/packages"
cp -R "${PROJECT_ROOT}/prompts" "${OUT_DIR}/prompts"
cp -R "${PROJECT_ROOT}/skills" "${OUT_DIR}/skills"
cp -R "${PROJECT_ROOT}/hooks" "${OUT_DIR}/hooks"
cp -R "${PROJECT_ROOT}/.codex-plugin" "${OUT_DIR}/.codex-plugin"

cp "${PROJECT_ROOT}/README.md" "${OUT_DIR}/README.md"
cp "${PROJECT_ROOT}/CHANGELOG.md" "${OUT_DIR}/CHANGELOG.md"
cp "${PROJECT_ROOT}/RELEASE.md" "${OUT_DIR}/RELEASE.md"
cp "${PROJECT_ROOT}/ROADMAP.md" "${OUT_DIR}/ROADMAP.md"
cp "${PROJECT_ROOT}/package.json" "${OUT_DIR}/package.json"
cp "${PROJECT_ROOT}/scripts/check.js" "${OUT_DIR}/scripts/check.js"
cp "${PROJECT_ROOT}/scripts/smoke-test.js" "${OUT_DIR}/scripts/smoke-test.js"
cp "${PROJECT_ROOT}/scripts/package-codex-plugin.sh" "${OUT_DIR}/scripts/package-codex-plugin.sh"

cat > "${OUT_DIR}/bundle-summary.json" <<EOF
{
  "schemaVersion": "code-agent-bundle-summary.v1",
  "bundleType": "release",
  "generatedBy": "scripts/package-release.sh",
  "includes": {
    "apps": [
      "apps/cli",
      "apps/demo"
    ],
    "docs": [
      "README.md",
      "CHANGELOG.md",
      "RELEASE.md",
      "ROADMAP.md",
      "docs/"
    ],
    "runtime": [
      "packages/",
      "prompts/",
      "skills/"
    ],
    "plugin": [
      ".codex-plugin/",
      "hooks/"
    ]
  }
}
EOF

cat > "${OUT_DIR}/index.html" <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Code Agent Release Bundle</title>
  <style>
    body { margin: 0; font-family: Georgia, "Palatino Linotype", serif; background: #f5f0e6; color: #182126; }
    main { max-width: 980px; margin: 0 auto; padding: 28px 18px 56px; }
    section { border: 1px solid #d8c8ab; background: rgba(255,250,241,0.92); padding: 18px; margin-bottom: 16px; }
    h1, h2 { margin: 0 0 10px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 4px 0; }
    a { color: #b14d2c; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { font-family: "SFMono-Regular", Menlo, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Code Agent Release Bundle</h1>
      <p>This bundle packages the coding-agent runtime, demo, docs, plugin wrapper, and release metadata.</p>
    </section>
    <section>
      <h2>Core Docs</h2>
      <ul>
        <li><a href="./README.md">README.md</a></li>
        <li><a href="./CHANGELOG.md">CHANGELOG.md</a></li>
        <li><a href="./RELEASE.md">RELEASE.md</a></li>
        <li><a href="./ROADMAP.md">ROADMAP.md</a></li>
        <li><a href="./bundle-summary.json"><code>bundle-summary.json</code></a></li>
      </ul>
    </section>
    <section>
      <h2>Runtime And Demo</h2>
      <ul>
        <li><a href="./apps/cli/index.js"><code>apps/cli/index.js</code></a></li>
        <li><a href="./apps/demo/index.html"><code>apps/demo/index.html</code></a></li>
        <li><a href="./apps/demo/README.md"><code>apps/demo/README.md</code></a></li>
      </ul>
    </section>
    <section>
      <h2>Plugin Wrapper</h2>
      <ul>
        <li><a href="./.codex-plugin/plugin.json"><code>.codex-plugin/plugin.json</code></a></li>
        <li><a href="./hooks/session-start-codex"><code>hooks/session-start-codex</code></a></li>
      </ul>
    </section>
    <section>
      <h2>Integration Docs</h2>
      <ul>
        <li><a href="./docs/README.md"><code>docs/README.md</code></a></li>
        <li><a href="./docs/integration-guide.md"><code>docs/integration-guide.md</code></a></li>
        <li><a href="./docs/machine-state-api.md"><code>docs/machine-state-api.md</code></a></li>
        <li><a href="./docs/machine-state-schema.md"><code>docs/machine-state-schema.md</code></a></li>
      </ul>
    </section>
  </main>
</body>
</html>
EOF

printf 'Packaged release bundle at %s\n' "${OUT_DIR}"
