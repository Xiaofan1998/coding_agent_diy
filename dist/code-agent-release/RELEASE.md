# Release Guide

This document is the practical handoff checklist for the current `0.1.0` coding-agent release.

## Release Scope

The current release includes:

- terminal-first coding-agent runtime
- plan / goal / review / workflow / trace persistence
- approval and governance chain
- machine-state snapshot / summary / ui / diff / index exports
- zero-dependency demo app and preview server
- codex-plugin wrapper and packaging script

## Verification

Run both:

```bash
/Users/zyb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./scripts/check.js
/Users/zyb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./scripts/smoke-test.js
```

Do not claim release readiness without fresh passing runs.

## Plugin Packaging

Build the codex-plugin bundle:

```bash
bash ./scripts/package-codex-plugin.sh
```

Verify that the bundle contains:

- `.codex-plugin/plugin.json`
- `hooks/hooks-codex.json`
- `hooks/session-start-codex`
- `skills/builtin/`
- `README.md`
- `CHANGELOG.md`
- integration docs

## Demo And Preview

Start the preview server:

```bash
./bin/code-agent demo preview 4173
```

Open:

```text
http://127.0.0.1:4173/
```

Recommended demo path:

1. show the preview homepage
2. open the demo app
3. click `Load Current Preview State`
4. switch between `clear`, `approval-pending`, and `governance-hold`
5. inspect machine-state artifacts and approval/workflow audit artifacts

## Machine-State Deliverables

Stable machine-facing outputs:

- `code-agent-state.v1`
- `code-agent-state-summary.v1`
- `code-agent-ui-state.v1`
- `code-agent-state-diff.v1`
- `code-agent-state-artifact-index.v1`
- `code-agent-preview-home.v1`

Supporting docs:

- [Machine-State Schema](./docs/machine-state-schema.md)
- [Machine-State API Contract](./docs/machine-state-api.md)
- [Preview Home API](./docs/preview-home-api.md)
- [Integration Guide](./docs/integration-guide.md)

## Known Limits

- depends on Node `node:sqlite`
- local fallback is narrower than online model-backed orchestration
- demo and preview surfaces are static / lightweight, not a full web app
- plugin bundle is intentionally minimal and not a marketplace-ready release package

## Recommended Next Work

- turn demo app into a fuller frontend shell
- add a release changelog discipline beyond `0.1.0`
- add plugin install/test automation
- add a richer release packaging story for distribution
