# smoke dashboard

- Generated at: 2026-06-30T03:56:08.416Z
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
- Latest workflow: workflow_b0adee08-fb08-46da-b5be-d26ddd79ae05 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T03-56-02-governance-hold-workflow.md, docs/agent-plans/2026-06-30T03-55-58-smoke-workflow.md, docs/agent-plans/2026-06-30T03-55-30-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T03-56-02-code-review.md, docs/agent-reviews/2026-06-30T03-56-02-repo-review.md, docs/agent-reviews/2026-06-30T03-56-02-plan-review.md
- Approval requests: approval_122b3a4d-6413-405c-86e3-3e9cad92d8c3 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_cf323d7c-de8f-4d79-9d07-c07a3a7e2bc8 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_524400f9-dfa3-41a5-9aa6-a8b0860b0edf (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T03-56-06-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T03-56-03-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T03-56-08-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T03-56-04-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_0737ef6b-5296-450f-b2f4-a5c45010dcea, approvalRequest:approval_122b3a4d-6413-405c-86e3-3e9cad92d8c3, workflowArtifact:workflowartifact_71cad727-852a-4a2a-942b-86230de380c0, bundleIndexArtifact:bundleartifact_38813dc6-ef56-48e0-9ff3-7a6831d789ba, approvalArtifact:approvalartifact_0737ef6b-5296-450f-b2f4-a5c45010dcea, workflowRun:workflow_b0adee08-fb08-46da-b5be-d26ddd79ae05, planArtifact:planartifact_ee0c4348-2e48-458e-80d2-0c354c2c2a4f, reviewArtifact:reviewartifact_f14f4615-008d-4d48-8f7d-eab9c01e495e, traceArtifact:traceartifact_422045e7-1014-451e-a64c-d28acdc6448f
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_b0adee08-fb08-46da-b5be-d26ddd79ae05 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_38813dc6-ef56-48e0-9ff3-7a6831d789ba
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T03-56-08-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_ee0c4348-2e48-458e-80d2-0c354c2c2a4f, planartifact_65d43079-1370-4f7a-a4c8-a03a00e6b666, planartifact_62e0c489-b9a4-4692-aade-2136d32aa244
- Recent review artifact ids: reviewartifact_f14f4615-008d-4d48-8f7d-eab9c01e495e, reviewartifact_fe4719ac-a25a-4002-b363-d9d11eef25d1, reviewartifact_0b64ab73-cea8-42ae-a217-4628798cb213
- Recent workflow artifact ids: workflowartifact_71cad727-852a-4a2a-942b-86230de380c0
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T03-56-04-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_0737ef6b-5296-450f-b2f4-a5c45010dcea, approvalartifact_414a90f8-fa97-4993-9542-9d0bc6760dd7
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T03-56-06-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T03-56-03-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T03-56-08-smoke-bundle-index.md
- Recent approval summaries: approval_122b3a4d-6413-405c-86e3-3e9cad92d8c3 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_cf323d7c-de8f-4d79-9d07-c07a3a7e2bc8 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_524400f9-dfa3-41a5-9aa6-a8b0860b0edf (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_422045e7-1014-451e-a64c-d28acdc6448f, traceartifact_afb43b86-b0c2-48f9-a2cc-3a202af8407a, traceartifact_04c57bd6-00cd-4143-99bc-366b2e6b456b
- Recent trace artifact paths: docs/agent-traces/2026-06-30T03-56-05-smoke-traces.md, docs/agent-traces/2026-06-30T03-56-02-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T03-55-58-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.