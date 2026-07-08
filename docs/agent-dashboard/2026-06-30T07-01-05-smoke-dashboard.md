# smoke dashboard

- Generated at: 2026-06-30T07:01:05.343Z
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
- Latest workflow: workflow_9241ce1c-e297-4c48-9b1b-1c818458f091 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T07-01-00-governance-hold-workflow.md, docs/agent-plans/2026-06-30T07-00-57-smoke-workflow.md, docs/agent-plans/2026-06-30T07-00-36-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T07-01-00-code-review.md, docs/agent-reviews/2026-06-30T07-01-00-repo-review.md, docs/agent-reviews/2026-06-30T07-01-00-plan-review.md
- Approval requests: approval_62a0937a-a5f1-4c77-8b09-fdd415dad5c9 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_706b450b-1f66-427f-839c-f764fbbc85bb (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_2014e11f-3214-4cea-8130-a80b6bc5aa65 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T07-01-03-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T07-01-00-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T07-01-05-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T07-01-02-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_5616efb0-fd51-4013-a491-ee0cf715a468, approvalRequest:approval_62a0937a-a5f1-4c77-8b09-fdd415dad5c9, workflowArtifact:workflowartifact_7737f7de-e403-4bfb-8f61-69b021b78329, bundleIndexArtifact:bundleartifact_479cf259-b6f4-42f2-b11f-63631f7d972d, approvalArtifact:approvalartifact_5616efb0-fd51-4013-a491-ee0cf715a468, workflowRun:workflow_9241ce1c-e297-4c48-9b1b-1c818458f091, planArtifact:planartifact_51382f99-2f01-4c4e-af73-6695cb24843a, reviewArtifact:reviewartifact_f79a5ea9-1fab-47ab-9053-0ba7bc6d986e, traceArtifact:traceartifact_c3d03f90-66cd-4692-ac52-b85c925b81c4
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_9241ce1c-e297-4c48-9b1b-1c818458f091 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_479cf259-b6f4-42f2-b11f-63631f7d972d
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T07-01-05-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_51382f99-2f01-4c4e-af73-6695cb24843a, planartifact_b6650780-07e5-4247-b5d8-ec15c43a85f3, planartifact_9493c0c7-b4c9-4ee8-bcbd-a4f96ff397e9
- Recent review artifact ids: reviewartifact_f79a5ea9-1fab-47ab-9053-0ba7bc6d986e, reviewartifact_07262127-40bc-468c-986c-4d00a90ee73f, reviewartifact_29623323-f769-4b9a-ba74-2a067a19fbd5
- Recent workflow artifact ids: workflowartifact_7737f7de-e403-4bfb-8f61-69b021b78329
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T07-01-02-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_5616efb0-fd51-4013-a491-ee0cf715a468, approvalartifact_84a0dbfb-ff27-412f-812c-3ecb283c9327
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T07-01-03-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T07-01-00-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T07-01-05-smoke-bundle-index.md
- Recent approval summaries: approval_62a0937a-a5f1-4c77-8b09-fdd415dad5c9 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_706b450b-1f66-427f-839c-f764fbbc85bb (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_2014e11f-3214-4cea-8130-a80b6bc5aa65 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_c3d03f90-66cd-4692-ac52-b85c925b81c4, traceartifact_a8b979e1-9230-46c2-9b6e-a1354e1b6068, traceartifact_ef03b237-cca8-4703-88c0-a7e2087fba4a
- Recent trace artifact paths: docs/agent-traces/2026-06-30T07-01-02-smoke-traces.md, docs/agent-traces/2026-06-30T07-01-00-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T07-00-57-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.