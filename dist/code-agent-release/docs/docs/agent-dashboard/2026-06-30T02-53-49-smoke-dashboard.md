# smoke dashboard

- Generated at: 2026-06-30T02:53:49.508Z
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
- Latest workflow: workflow_4fc3d78f-3bd3-4233-b79f-a002c4c65153 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T02-53-43-governance-hold-workflow.md, docs/agent-plans/2026-06-30T02-53-39-smoke-workflow.md, docs/agent-plans/2026-06-30T02-53-11-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T02-53-43-code-review.md, docs/agent-reviews/2026-06-30T02-53-43-repo-review.md, docs/agent-reviews/2026-06-30T02-53-43-plan-review.md
- Approval requests: approval_0fc572d2-5394-47d6-9366-6c6e9e5640cc (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_a3fe0f0f-8434-450b-a0cd-e44227b16154 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_c3605b67-b629-4cd7-bfed-3272a5a663b2 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T02-53-47-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-53-43-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T02-53-49-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T02-53-45-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_17c2da68-3bc5-4ab7-a56a-9238e898e9d4, approvalRequest:approval_0fc572d2-5394-47d6-9366-6c6e9e5640cc, workflowArtifact:workflowartifact_e01ac56a-050b-457d-a6a0-0bd8670fdc7c, bundleIndexArtifact:bundleartifact_3f885b1a-1266-48de-b311-7d7bab3129a3, approvalArtifact:approvalartifact_17c2da68-3bc5-4ab7-a56a-9238e898e9d4, workflowRun:workflow_4fc3d78f-3bd3-4233-b79f-a002c4c65153, planArtifact:planartifact_947c3b94-4d9c-4222-9d1a-e77e404fabab, reviewArtifact:reviewartifact_7ab62678-b99a-4c97-98ae-37520a37d25b, traceArtifact:traceartifact_09a321b3-b76a-4c65-b5d8-0ddf9d2edec2
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_4fc3d78f-3bd3-4233-b79f-a002c4c65153 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_3f885b1a-1266-48de-b311-7d7bab3129a3
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-53-49-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_947c3b94-4d9c-4222-9d1a-e77e404fabab, planartifact_f5644958-4681-4368-a482-209fe20f49ef, planartifact_c5a12959-bdff-4abf-8fa9-635ccfd968de
- Recent review artifact ids: reviewartifact_7ab62678-b99a-4c97-98ae-37520a37d25b, reviewartifact_94360a47-4ce9-4b72-bba6-60266bc3339b, reviewartifact_bc3a8abf-0ffb-4fb7-a373-cb6522a2aed0
- Recent workflow artifact ids: workflowartifact_e01ac56a-050b-457d-a6a0-0bd8670fdc7c
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T02-53-45-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_17c2da68-3bc5-4ab7-a56a-9238e898e9d4, approvalartifact_50e46cd5-f49d-423a-aeca-8f98bfaaff01
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T02-53-47-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-53-43-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-53-49-smoke-bundle-index.md
- Recent approval summaries: approval_0fc572d2-5394-47d6-9366-6c6e9e5640cc (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_a3fe0f0f-8434-450b-a0cd-e44227b16154 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_c3605b67-b629-4cd7-bfed-3272a5a663b2 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_09a321b3-b76a-4c65-b5d8-0ddf9d2edec2, traceartifact_3c31b00c-8161-4106-aab6-a952db5f188b, traceartifact_7d006951-70b5-4559-a698-3adf712bc52a
- Recent trace artifact paths: docs/agent-traces/2026-06-30T02-53-45-smoke-traces.md, docs/agent-traces/2026-06-30T02-53-43-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T02-53-40-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.