# smoke dashboard

- Generated at: 2026-06-18T08:05:40.690Z
- Active goal: smoke test goal
- Strategy mode: balanced

## Summary
- Plan progress: 0/1
- Strategy mode: balanced
- Linked subagents: 1
- Pending subagent reviews: 1
- Reviews: 13
- Open approvals: 2
- Governance summary: openApprovals=2 hold=yes approvalPending=yes goalBlocked=no latestWorkflowStatus=pending_approval reasonCodes=governance_hold,approval_pending,review_plan_needs_attention,review_repo_needs_attention,review_code_needs_attention blocker=(none)
- Workflows: 2
- Workflow artifacts: 1
- Traces: 48
- Trace artifacts: 3
- Latest workflow: workflow_8aa73788-7646-4436-ae5e-78cf7e78a297 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T08-05-36-governance-hold-workflow.md, docs/agent-plans/2026-06-18T08-05-33-smoke-workflow.md, docs/agent-plans/2026-06-18T08-05-11-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T08-05-36-code-review.md, docs/agent-reviews/2026-06-18T08-05-36-repo-review.md, docs/agent-reviews/2026-06-18T08-05-36-plan-review.md
- Approval requests: approval_246b4f6f-5b9f-49bb-9265-41b387592120 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_e6ab8032-8057-43a0-9ac5-9383234f08b6 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_a597da58-7991-4c65-aab3-07dc24edb990 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T08-05-38-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T08-05-36-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T08-05-40-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T08-05-37-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_f6f5c2ce-23c9-4452-b998-5aa21a13887a, approvalRequest:approval_246b4f6f-5b9f-49bb-9265-41b387592120, workflowArtifact:workflowartifact_32c54127-9e43-4f8d-aadc-58c6e55b0d04, bundleIndexArtifact:bundleartifact_c3a0fad3-ea17-47b6-84f4-c51580a0a803, approvalArtifact:approvalartifact_f6f5c2ce-23c9-4452-b998-5aa21a13887a, workflowRun:workflow_8aa73788-7646-4436-ae5e-78cf7e78a297, planArtifact:planartifact_4d314371-c48e-46db-b261-dacb57e7af5e, reviewArtifact:reviewartifact_9485e558-7002-4d04-8ef5-0b8b9c64a7c7, traceArtifact:traceartifact_e129b03d-055b-47b9-92bf-444539198adb
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_8aa73788-7646-4436-ae5e-78cf7e78a297 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_c3a0fad3-ea17-47b6-84f4-c51580a0a803
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T08-05-40-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_4d314371-c48e-46db-b261-dacb57e7af5e, planartifact_4c7e147d-af82-4897-8f3c-6adfeddaf6ae, planartifact_aaeba715-afe0-4d8a-9ae7-0a71a6d2b769
- Recent review artifact ids: reviewartifact_9485e558-7002-4d04-8ef5-0b8b9c64a7c7, reviewartifact_a9887786-5760-47ed-b040-95200774fc04, reviewartifact_44c0a307-dd01-44c1-9600-654995e16786
- Recent workflow artifact ids: workflowartifact_32c54127-9e43-4f8d-aadc-58c6e55b0d04
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T08-05-37-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_f6f5c2ce-23c9-4452-b998-5aa21a13887a, approvalartifact_6dcafd85-20e8-4a7e-9b39-acbee368d6e7
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T08-05-38-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T08-05-36-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T08-05-40-smoke-bundle-index.md
- Recent approval summaries: approval_246b4f6f-5b9f-49bb-9265-41b387592120 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_e6ab8032-8057-43a0-9ac5-9383234f08b6 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_a597da58-7991-4c65-aab3-07dc24edb990 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_e129b03d-055b-47b9-92bf-444539198adb, traceartifact_0d6a69cf-5bdf-46ad-996e-bb85695e1d52, traceartifact_51f289f3-58f0-46d9-b907-bd19361e26ea
- Recent trace artifact paths: docs/agent-traces/2026-06-18T08-05-38-smoke-traces.md, docs/agent-traces/2026-06-18T08-05-36-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T08-05-33-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.