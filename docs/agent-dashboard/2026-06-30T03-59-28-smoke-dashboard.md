# smoke dashboard

- Generated at: 2026-06-30T03:59:28.970Z
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
- Latest workflow: workflow_8dd2e9df-8c87-434b-8eb5-00b0dec5cccb (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T03-59-22-governance-hold-workflow.md, docs/agent-plans/2026-06-30T03-59-17-smoke-workflow.md, docs/agent-plans/2026-06-30T03-58-46-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T03-59-22-code-review.md, docs/agent-reviews/2026-06-30T03-59-22-repo-review.md, docs/agent-reviews/2026-06-30T03-59-22-plan-review.md
- Approval requests: approval_c42ae583-887e-411d-989b-df1db30d64e9 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_6193af37-07f2-4e2e-be7a-acc14259aa26 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_fe235069-e0ac-41fa-a1d9-71cab2568da0 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T03-59-26-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T03-59-23-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T03-59-28-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T03-59-24-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_8faea659-ad53-463d-b714-ae5057ffacce, approvalRequest:approval_c42ae583-887e-411d-989b-df1db30d64e9, workflowArtifact:workflowartifact_ec8c96e6-2fdf-4b66-92b3-5917c4367def, bundleIndexArtifact:bundleartifact_cedefee4-188d-4be5-8bba-6f6545e67fd9, approvalArtifact:approvalartifact_8faea659-ad53-463d-b714-ae5057ffacce, workflowRun:workflow_8dd2e9df-8c87-434b-8eb5-00b0dec5cccb, planArtifact:planartifact_11981fe9-3b13-4cb5-95fb-89721073e7a8, reviewArtifact:reviewartifact_d8e48bc5-475e-445c-b8f2-ff11f39c8352, traceArtifact:traceartifact_cc1594ad-834d-4388-af7f-31dd8fe41d68
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_8dd2e9df-8c87-434b-8eb5-00b0dec5cccb (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_cedefee4-188d-4be5-8bba-6f6545e67fd9
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T03-59-28-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_11981fe9-3b13-4cb5-95fb-89721073e7a8, planartifact_5f029375-2d2e-490f-87fc-70fb1335fb71, planartifact_7d279505-3b5b-4db1-a22b-50b8e9d6c74d
- Recent review artifact ids: reviewartifact_d8e48bc5-475e-445c-b8f2-ff11f39c8352, reviewartifact_3e855b30-b17d-464b-8b94-6109219d6080, reviewartifact_1859a0ed-f493-4c1e-9cc5-b078987aa817
- Recent workflow artifact ids: workflowartifact_ec8c96e6-2fdf-4b66-92b3-5917c4367def
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T03-59-24-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_8faea659-ad53-463d-b714-ae5057ffacce, approvalartifact_be09ef71-c3b3-49bf-8962-c0bf2386e8a8
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T03-59-26-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T03-59-23-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T03-59-28-smoke-bundle-index.md
- Recent approval summaries: approval_c42ae583-887e-411d-989b-df1db30d64e9 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_6193af37-07f2-4e2e-be7a-acc14259aa26 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_fe235069-e0ac-41fa-a1d9-71cab2568da0 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_cc1594ad-834d-4388-af7f-31dd8fe41d68, traceartifact_8babe3e3-e478-4d5e-9c27-357925fca452, traceartifact_ba455967-1e2e-485c-a25b-284aa418ddda
- Recent trace artifact paths: docs/agent-traces/2026-06-30T03-59-25-smoke-traces.md, docs/agent-traces/2026-06-30T03-59-22-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T03-59-18-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.