# smoke dashboard

- Generated at: 2026-06-17T16:37:20.916Z
- Active goal: smoke test goal

## Summary
- Plan progress: 0/1
- Linked subagents: 1
- Pending subagent reviews: 1
- Reviews: 13
- Open approvals: 2
- Governance summary: openApprovals=2 hold=yes approvalPending=yes goalBlocked=no latestWorkflowStatus=pending_approval reasonCodes=governance_hold,approval_pending,review_plan_needs_attention,review_repo_needs_attention,review_code_needs_attention blocker=(none)
- Workflows: 2
- Workflow artifacts: 1
- Traces: 57
- Trace artifacts: 3
- Latest workflow: workflow_926cd514-944b-4fc3-a963-cab956ab677a (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-17T16-37-15-governance-hold-workflow.md, docs/agent-plans/2026-06-17T16-37-12-smoke-workflow.md, docs/agent-plans/2026-06-17T16-36-48-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-17T16-37-15-code-review.md, docs/agent-reviews/2026-06-17T16-37-15-repo-review.md, docs/agent-reviews/2026-06-17T16-37-15-plan-review.md
- Approval requests: approval_1b7657cd-3228-430f-89b0-c5747589a39b (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_48546763-7f56-46dc-aada-8557f3c7a74d (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_a79df775-fb71-4a44-95fb-36632bcc4ecc (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-17T16-37-18-smoke-approval-artifact.md, docs/agent-approvals/2026-06-17T16-37-15-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-17T16-37-20-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-17T16-37-17-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_0b587eb5-b02f-437c-bdd4-6e8f81b9af98, approvalRequest:approval_1b7657cd-3228-430f-89b0-c5747589a39b, workflowArtifact:workflowartifact_60201c7f-f1a4-4ce9-9532-ae1063d9aae1, bundleIndexArtifact:bundleartifact_097f15bd-0025-4d92-9e89-27c5f5d26a97, approvalArtifact:approvalartifact_0b587eb5-b02f-437c-bdd4-6e8f81b9af98, workflowRun:workflow_926cd514-944b-4fc3-a963-cab956ab677a, planArtifact:planartifact_56261249-59ea-4383-85e3-99d827c949ba, reviewArtifact:reviewartifact_2bc388af-3d50-4f7f-9ef1-63281d8351b9, traceArtifact:traceartifact_96114e0a-a605-4bd7-a390-4298cb610ee1

## Linked Summaries
- Latest workflow bundle: workflow_926cd514-944b-4fc3-a963-cab956ab677a (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_097f15bd-0025-4d92-9e89-27c5f5d26a97
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-17T16-37-20-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_56261249-59ea-4383-85e3-99d827c949ba, planartifact_f89f9ee6-f440-48f1-8d4b-dc400eaff073, planartifact_9aa13df0-c372-4041-86e4-c95365716eba
- Recent review artifact ids: reviewartifact_2bc388af-3d50-4f7f-9ef1-63281d8351b9, reviewartifact_69646bbb-7cc8-4921-a02c-e43cc697045b, reviewartifact_5878a340-8be7-4be1-9f61-eebdfc9ade7c
- Recent workflow artifact ids: workflowartifact_60201c7f-f1a4-4ce9-9532-ae1063d9aae1
- Recent workflow artifact paths: docs/agent-workflows/2026-06-17T16-37-17-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_0b587eb5-b02f-437c-bdd4-6e8f81b9af98, approvalartifact_bae2e5f9-d3cd-4e57-9187-edaf1be8ff14
- Recent approval artifact paths: docs/agent-approvals/2026-06-17T16-37-18-smoke-approval-artifact.md, docs/agent-approvals/2026-06-17T16-37-15-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-17T16-37-20-smoke-bundle-index.md
- Recent approval summaries: approval_1b7657cd-3228-430f-89b0-c5747589a39b (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_48546763-7f56-46dc-aada-8557f3c7a74d (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_a79df775-fb71-4a44-95fb-36632bcc4ecc (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_96114e0a-a605-4bd7-a390-4298cb610ee1, traceartifact_cb16c87f-c1f5-4e2e-971b-3e5247f372a4, traceartifact_47f1c389-fb2b-4d2f-813d-b1bcf270968b
- Recent trace artifact paths: docs/agent-traces/2026-06-17T16-37-17-smoke-traces.md, docs/agent-traces/2026-06-17T16-37-15-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-17T16-37-12-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.