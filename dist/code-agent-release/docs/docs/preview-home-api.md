# Preview Home API

This document describes the lightweight JSON model served by the built-in preview server.

## Endpoint

```text
/preview-state.json
/preview-state.json?state=clear
/preview-state.json?state=approval-pending
/preview-state.json?state=governance-hold
```

## Schema Version

- `code-agent-preview-home.v1`

## Intended Use

- seed the demo app with one request
- inspect the current preview-home model
- drive lightweight browser-side rendering experiments

## Top-Level Fields

- `schemaVersion`
- `generatedAt`
- `stateFilter`
- `labels`
- `latestMachineState`
- `latestUiState`
- `latestCards`
- `latestAuditCards`
- `attentionItems`
- `primaryEntryPoints`
- `auditSurfaces`
- `recommendedActions`
- `recentEvents`
- `htmlArtifacts`
- `jsonArtifacts`

## Notes

- The endpoint is served only by the local preview server.
- It is intentionally derived from the same logic used to render the preview home page.
- Different `state` query values change both content and ordering.
