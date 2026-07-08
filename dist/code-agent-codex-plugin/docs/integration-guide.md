# Integration Guide

This guide shows a practical end-to-end flow for integrating the coding agent with external tools, dashboards, or automation.

## 1. Read A Full Machine-State Snapshot

```bash
./bin/code-agent machine-state show
```

Use this when you need the full governance-aware project state.

Best for:

- orchestration backends
- debugging state transitions
- baseline snapshots before diffing

## 2. Read A Compact Summary

```bash
./bin/code-agent machine-state summary
```

Use this when you want a smaller payload with:

- goal
- plan progress
- governance summary
- tool policy
- latest workflow
- recommendation labels

## 3. Read A UI Payload

```bash
./bin/code-agent machine-state ui
```

Use this when you want a payload that can be mapped directly into cards/sections.

It already contains:

- `hero`
- `cards`
- `sections`

If the preview server is running, you can also consume:

```text
/preview-state.json
```

This is a lightweight preview-home JSON model that can seed the demo app directly.

Contract reference:

- [Preview Home API](./preview-home-api.md)

Inside the demo app, the fastest path is:

1. optionally choose a preview filter
2. leave the preview URL empty or set it to `/preview-state.json`
3. click `Load Current Preview State`

The demo app keeps the preview URL synchronized with the selected filter so the active source remains shareable.

The filter is also mirrored into the page URL query, so refreshing the browser preserves the current preview view.
Changing the filter refreshes the current preview-state view immediately.
The current filter is also exposed as clickable pills in the top bar.

When opened through the preview server, the demo app will also attempt this automatically on first load.

## 4. Export Static UI Assets

```bash
./bin/code-agent machine-state ui-export "ui snapshot"
./bin/code-agent machine-state ui-html-export "ui dashboard"
./bin/code-agent machine-state ui-demo-export "ui demo"
```

Use the JSON export when a frontend fetches prebuilt payloads.

Use the HTML export when you want:

- a quick demo page
- static review snapshots
- low-friction stakeholder sharing

Use the UI demo export when you want:

- a single demo page that combines ui-state and state artifact index
- a fast local integration smoke-test
- a lightweight handoff to frontend teammates

To preview locally:

```bash
./bin/code-agent demo preview 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## 5. Read The Artifact Index

```bash
./bin/code-agent machine-state index
./bin/code-agent machine-state index-export "state index"
```

The artifact index is the easiest way to navigate exported machine-state artifacts.

It includes:

- `countsByKind`
- `latestByKind`
- typed `items`

## 6. Diff State Snapshots

```bash
./bin/code-agent machine-state diff <fromId> [toId]
```

Use this to compare:

- governance changes
- plan completion changes
- recommendation changes
- artifact coverage changes

The diff contains both:

- exact `changes`
- compact `summary`

## 7. Inspect Governance And Approval Chains

Pair machine-state with these commands when you need audit detail:

```bash
./bin/code-agent approvals list
./bin/code-agent approval-artifacts export <approvalId>
./bin/code-agent workflow export
./bin/code-agent dashboard export "project snapshot"
```

Recommended order:

1. `machine-state summary`
2. `machine-state index`
3. `approval-artifacts export`
4. `workflow export`
5. `dashboard export`

## 8. Files You Will Usually Consume

- `docs/agent-state/*.json`
- `docs/agent-state/*.html`
- `apps/demo/index.html`
- `docs/agent-approvals/*.md`
- `docs/agent-workflows/*.md`
- `docs/agent-dashboard/*.md`

## 9. Contract References

- [Machine-State Schema](./machine-state-schema.md)
- [Machine-State API Contract](./machine-state-api.md)
- [Docs Index](./README.md)
