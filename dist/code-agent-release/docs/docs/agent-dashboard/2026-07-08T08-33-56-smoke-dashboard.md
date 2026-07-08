# smoke dashboard

- Generated at: 2026-07-08T08:33:56.636Z
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
- Latest workflow: workflow_def2a9fb-66f9-413e-94f8-9f54160755b2 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-07-08T08-33-52-governance-hold-workflow.md, docs/agent-plans/2026-07-08T08-33-49-smoke-workflow.md, docs/agent-plans/2026-07-08T08-33-29-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-07-08T08-33-52-code-review.md, docs/agent-reviews/2026-07-08T08-33-52-repo-review.md, docs/agent-reviews/2026-07-08T08-33-52-plan-review.md
- Approval requests: approval_a739c01f-5a53-4e9f-b9d4-847c30ad22ff (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_c574f6d7-02fa-4535-87aa-1efdab5d68a7 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_8a5cef3d-3fe7-48c7-8342-931344cc8dcb (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-07-08T08-33-55-smoke-approval-artifact.md, docs/agent-approvals/2026-07-08T08-33-52-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-07-08T08-33-56-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-07-08T08-33-53-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_aeacbf2e-6bc4-4cf2-9c67-e485457e662b, approvalRequest:approval_a739c01f-5a53-4e9f-b9d4-847c30ad22ff, workflowArtifact:workflowartifact_f0a89ff2-a4c1-4b62-be88-11cfdbd4e27c, bundleIndexArtifact:bundleartifact_3fcd0175-a86d-4a0a-94c0-3ba2cb562902, approvalArtifact:approvalartifact_aeacbf2e-6bc4-4cf2-9c67-e485457e662b, workflowRun:workflow_def2a9fb-66f9-413e-94f8-9f54160755b2, planArtifact:planartifact_83ebdcdb-f9e7-4cf5-bcb8-2e3890738a90, reviewArtifact:reviewartifact_ef05be2a-0682-415f-b4a1-8b66008d91c4, traceArtifact:traceartifact_1a508af1-3b3b-4d39-a77d-496c23245aa8
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_def2a9fb-66f9-413e-94f8-9f54160755b2 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_3fcd0175-a86d-4a0a-94c0-3ba2cb562902
- Recent bundle-index artifact paths: docs/agent-bundles/2026-07-08T08-33-56-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_83ebdcdb-f9e7-4cf5-bcb8-2e3890738a90, planartifact_958638e9-a52e-4393-a87d-63a51fa32094, planartifact_0b1def62-df3d-4ad8-9b4a-0abd33fba7d7
- Recent review artifact ids: reviewartifact_ef05be2a-0682-415f-b4a1-8b66008d91c4, reviewartifact_a0722ddc-ca49-4815-b3cf-b48595143656, reviewartifact_821c7152-925c-4f87-97bb-7b784dd8171e
- Recent workflow artifact ids: workflowartifact_f0a89ff2-a4c1-4b62-be88-11cfdbd4e27c
- Recent workflow artifact paths: docs/agent-workflows/2026-07-08T08-33-53-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_aeacbf2e-6bc4-4cf2-9c67-e485457e662b, approvalartifact_35ceb0e5-e1ed-41ae-86e3-366d02eb5b49
- Recent approval artifact paths: docs/agent-approvals/2026-07-08T08-33-55-smoke-approval-artifact.md, docs/agent-approvals/2026-07-08T08-33-52-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-07-08T08-33-56-smoke-bundle-index.md
- Recent approval summaries: approval_a739c01f-5a53-4e9f-b9d4-847c30ad22ff (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_c574f6d7-02fa-4535-87aa-1efdab5d68a7 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_8a5cef3d-3fe7-48c7-8342-931344cc8dcb (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_1a508af1-3b3b-4d39-a77d-496c23245aa8, traceartifact_09c9d770-18d2-48bd-a181-90f7ae2efb65, traceartifact_2eb7ef89-518a-49f3-8858-418a991070c0
- Recent trace artifact paths: docs/agent-traces/2026-07-08T08-33-54-smoke-traces.md, docs/agent-traces/2026-07-08T08-33-52-governance-hold-workflow-traces.md, docs/agent-traces/2026-07-08T08-33-50-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.