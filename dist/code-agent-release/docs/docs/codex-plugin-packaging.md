# Codex Plugin Packaging

This repository includes a minimal Codex plugin wrapper so the coding-agent project can be packaged in a Codex-friendly layout.

## Included Plugin Files

- `.codex-plugin/plugin.json`
- `hooks/hooks-codex.json`
- `hooks/session-start-codex`
- `skills/builtin/`
- optional `skills/repo/`

## Build A Distributable Bundle

Run:

```bash
./scripts/package-codex-plugin.sh
```

This creates:

```text
dist/code-agent-codex-plugin/
```

## Bundle Contents

The bundle includes:

- plugin manifest
- codex hooks
- built-in skills
- repo skills when present
- top-level README and CHANGELOG
- integration docs
- `bundle-summary.json`

## Intended Use

- internal plugin testing
- local plugin installation experiments
- preparing a minimal handoff bundle for Codex-compatible harnesses

## References

- [Codex Plugin Manifest](../.codex-plugin/plugin.json)
- [Bundle Summary Schema](./bundle-summary-schema.md)
- [Machine-State API Contract](./machine-state-api.md)
- [Integration Guide](./integration-guide.md)
