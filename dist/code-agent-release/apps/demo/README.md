# Demo App

This is a zero-dependency static frontend demo that reads exported machine-state artifacts.

## What It Reads

- `code-agent-ui-state.v1`
- `code-agent-state-artifact-index.v1`

## How To Use

1. Export machine-state artifacts:

```bash
./bin/code-agent machine-state ui-export "ui snapshot"
./bin/code-agent machine-state index-export "state index"
```

2. Start the built-in preview server:

```bash
./bin/code-agent demo preview 4173
```

3. Visit:

```text
http://127.0.0.1:4173/
```

4. Use the preview home page to jump to the demo app or recent exported state artifacts.

5. Inside the demo app, you can either:

- load exported `ui-state` and `state-index` JSON directly
- or point the demo at `/preview-state.json` as a single consolidated source
- or use **Load Current Preview State** for a one-click local preview flow
- and optionally select a preview filter before loading current preview state

Changing the preview filter will also keep the preview URL in sync, so the current source stays copyable.
Changing the preview filter will also refresh the current preview-state view immediately.
The same filter is mirrored as clickable pills in the top bar.

When served through the built-in preview server, the demo app will also try to auto-load `/preview-state.json` on first open.

When that auto-load succeeds, the top summary bar shows:

- current preview filter
- current data source
- ui-state schema version
- state-index schema version
- html/json artifact counts

The selected preview filter is mirrored into the browser URL query so refreshes keep the same view.

## Why It Exists

- validate the external integration surface
- provide a minimal visual reference for UI consumers
- prove that the exported state payloads are immediately usable
