# Machine-State API Contract

This document describes the machine-facing CLI and tool contract for external integrations.

## Full Snapshot

CLI:

```bash
./bin/code-agent machine-state show
```

Tool:

- `get_state_snapshot`

Returns:

- `schemaVersion: code-agent-state.v1`
- full governance-aware state payload

## Compact Summary

CLI:

```bash
./bin/code-agent machine-state summary
```

Tool:

- `get_state_summary`

Returns:

- `schemaVersion: code-agent-state-summary.v1`
- compact integration view for UI surfaces

## Artifact Index

CLI:

```bash
./bin/code-agent machine-state index
```

Tool:

- `get_state_artifact_index`

Returns:

- `schemaVersion: code-agent-state-artifact-index.v1`
- `countsByKind`
- `latestByKind`
- typed `items` over exported state artifacts

## UI Payload

CLI:

```bash
./bin/code-agent machine-state ui
```

Tool:

- `get_state_ui_payload`

Returns:

- `schemaVersion: code-agent-ui-state.v1`
- `hero`
- `cards`
- `sections`
- `governance`
- `recommendations`
- `latestWorkflow`

Artifact export:

```bash
./bin/code-agent machine-state ui-export "ui snapshot"
./bin/code-agent machine-state ui-html-export "ui dashboard"
./bin/code-agent machine-state ui-demo-export "ui demo"
```

Demo export:

```bash
./bin/code-agent machine-state demo-export "integration demo"
```

Index export:

```bash
./bin/code-agent machine-state index-export "state index"
```

## JSON Schema

CLI:

```bash
./bin/code-agent machine-state schema
```

Tool:

- `get_state_snapshot_schema`

Returns:

- JSON Schema with `$id: code-agent-state.v1`

## Snapshot Artifact Export

CLI:

```bash
./bin/code-agent machine-state export "snapshot title"
./bin/code-agent machine-state-artifacts list
./bin/code-agent machine-state-artifacts show <id>
```

Tools:

- `export_state_snapshot_artifact`
- `list_state_snapshot_artifacts`
- `read_state_snapshot_artifact`

## Snapshot Diff

CLI:

```bash
./bin/code-agent machine-state diff [fromId] [toId]
```

Tool:

- `diff_state_snapshot`

Returns:

- `schemaVersion: code-agent-state-diff.v1`
- `from`
- `to`
- `changed`
- `summary`
- `changes`

The `summary` layer includes:

- `changedFields`
- `highlights`
- `categories`
- `byCategory`

The `changes` layer remains the source of truth for exact field-level differences.
