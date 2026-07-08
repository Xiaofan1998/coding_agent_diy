# Machine-State Schema

This document describes the stable machine-readable state snapshot exported by the coding agent.

## Schema Id

- `code-agent-state.v1`

## Intended Use

- UI state hydration
- External workflow orchestration
- Monitoring and governance dashboards
- Snapshot diff baselining

## Top-Level Fields

- `schemaVersion`
- `generatedAt`
- `projectRoot`
- `session`
- `governance`
- `toolPolicy`
- `goal`
- `plan`
- `counts`
- `latestWorkflow`
- `recent`
- `recommendations`
- `artifactCoverage`

## Governance Fields

- `openApprovalCount`
- `openApprovalIds`
- `latestWorkflowStatus`
- `latestWorkflowReasonCodes`
- `governanceHoldActive`
- `approvalPendingActive`

## Compact Summary

For UI surfaces that do not need the full snapshot, prefer the compact machine-state summary view. It keeps:

- schema version
- generation timestamp
- goal
- plan progress
- governance summary
- tool policy
- latest workflow id/status/reason codes
- recommendation labels

## UI Payload

For card-based dashboards, prefer the UI payload view. It keeps:

- `schemaVersion: code-agent-ui-state.v1`
- `hero`
- `cards`
- `sections`
- `governance`
- `recommendations`
- `latestWorkflow`

## Diff Output

The machine-state diff command returns:

- `schemaVersion: code-agent-state-diff.v1`
- `from`
- `to`
- `changed`
- `summary`
- `changes`

The `summary` object is the compact human-facing layer and includes:

- `changedFields`
- `highlights`
- `categories`
- `byCategory`

## Source Of Truth

- Full snapshot generator: [packages/state-export/snapshot.js](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/packages/state-export/snapshot.js)
- JSON schema builder: [packages/state-export/schema.js](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/packages/state-export/schema.js)
- Snapshot artifact manager: [packages/state-export/artifact-manager.js](/Users/zyb/Downloads/xfbo_homework/code/code-agent-0617/packages/state-export/artifact-manager.js)
