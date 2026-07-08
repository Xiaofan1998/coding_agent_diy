# Bundle Summary Schema

This document describes the lightweight summary manifest written into packaged bundles.

## Schema Version

- `code-agent-bundle-summary.v1`

## Bundle Types

- `codex-plugin`
- `release`

## Purpose

Bundle summaries exist to make packaged outputs easier to inspect without recursively opening directories.

They provide:

- bundle type
- script that generated the bundle
- high-level path groupings

## Current Outputs

Plugin bundle:

- `dist/code-agent-codex-plugin/bundle-summary.json`

Release bundle:

- `dist/code-agent-release/bundle-summary.json`

## Typical Fields

- `schemaVersion`
- `bundleType`
- `generatedBy`
- `paths` or `includes`

## Relationship To Other Docs

- [Codex Plugin Packaging](./codex-plugin-packaging.md)
- [Release Packaging](./release-packaging.md)
- [Release Guide](../RELEASE.md)
