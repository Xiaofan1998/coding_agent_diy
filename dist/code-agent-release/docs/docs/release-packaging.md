# Release Packaging

This document describes the broader release-bundle packaging flow for the coding-agent project.

## Build A Release Bundle

Run:

```bash
bash ./scripts/package-release.sh
```

This creates:

```text
dist/code-agent-release/
```

## Bundle Contents

The bundle includes:

- runtime entrypoints under `apps/cli/`
- demo assets under `apps/demo/`
- plugin wrapper files under `.codex-plugin/` and `hooks/`
- `packages/`, `prompts/`, and `skills/`
- top-level docs: `README`, `CHANGELOG`, `RELEASE`, `ROADMAP`
- `docs/` integration and audit references
- core verification scripts
- `bundle-summary.json`

## Intended Use

- internal handoff bundles
- demo / review snapshots
- local distribution experiments
- packaging all materials needed for a 0.1.x release candidate

## Related Docs

- [Release Guide](../RELEASE.md)
- [Bundle Summary Schema](./bundle-summary-schema.md)
- [Codex Plugin Packaging](./codex-plugin-packaging.md)
- [Integration Guide](./integration-guide.md)
