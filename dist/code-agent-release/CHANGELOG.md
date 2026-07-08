# Changelog

## 0.1.0 - 2026-06-17

Initial vertically integrated coding-agent release.

### Core Agent

- Terminal-first CLI with `chat`, `run`, plan, goal, review, workflow, trace, and repo commands
- Responses API function-calling orchestration with local fallback and mock-model paths
- SQLite-backed state persistence for sessions, plans, goals, reviews, workflows, traces, approvals, and artifacts
- Skill discovery with repo-local, user-global, and built-in precedence plus support-file awareness
- Query-aware repo context selection and prompt budgeting
- Structured working-memory summaries for session context hygiene

### Subagents

- Narrow-context subagent runtime with explicit allowed-tool subsets
- Plan execution via subagents with workspace snapshots and diff tracking
- Governance-aware subagent restriction when pending approvals exist
- Subagent governance traces and records for auditability

### Governance

- Tool risk policy enforcement with `safe/caution/restricted/forbidden` semantics
- Policy-blocked tool actions automatically create approval requests
- Approval resolution, retry, override, and trace recording
- Approval review, plan review, repo review, code review, session review, strategy review
- Workflow status reasons with machine-readable reason codes such as `approval_pending` and `governance_hold`
- Unified governance summary surfaced through status and machine-state exports

### Artifacts

- Exporters for plan, review, approval, workflow, trace, dashboard, bundle-index, and machine-state artifacts
- Approval artifacts with typed timeline events and event codes
- Workflow, review, and trace artifacts linked back to approval activity
- Machine-state full snapshot, compact summary, UI payload, diff, and artifact index
- HTML exports for ui-state, integration demo, and preview surfaces

### Demo And Preview

- Zero-dependency static demo app under `apps/demo/`
- Local preview server with preview homepage, state-aware filtering, artifact navigation, and recent-event summaries
- Demo app support for direct `ui-state`, `state-index`, and `preview-state.json` ingestion
- One-click preview-state loading and top summary bar in the demo app

### Integration Docs

- Codex-like implementation plans in English and Chinese
- Machine-state schema reference
- Machine-state API contract
- Integration guide
- Docs index for design, integration, and audit materials
