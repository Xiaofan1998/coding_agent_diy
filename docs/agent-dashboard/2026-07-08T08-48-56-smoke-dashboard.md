# smoke dashboard

- Generated at: 2026-07-08T08:48:56.744Z
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
- Latest workflow: workflow_11030d1e-97be-4216-9e68-07bd75ec3f81 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-07-08T08-48-51-governance-hold-workflow.md, docs/agent-plans/2026-07-08T08-48-47-smoke-workflow.md, docs/agent-plans/2026-07-08T08-48-25-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-07-08T08-48-51-code-review.md, docs/agent-reviews/2026-07-08T08-48-51-repo-review.md, docs/agent-reviews/2026-07-08T08-48-51-plan-review.md
- Approval requests: approval_20648fee-468b-4d9a-8ba2-c296b5b940f3 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_4780677c-37f9-4764-a314-d972a20a1c4c (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_73f4ce79-5a2f-4643-b737-8153273bdcd3 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-07-08T08-48-54-smoke-approval-artifact.md, docs/agent-approvals/2026-07-08T08-48-51-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-07-08T08-48-56-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-07-08T08-48-53-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_082caabb-6628-4b0f-b3b5-9c6c5d797b16, approvalRequest:approval_20648fee-468b-4d9a-8ba2-c296b5b940f3, workflowArtifact:workflowartifact_3036881f-0dc8-4b91-9044-9125d666434c, bundleIndexArtifact:bundleartifact_6ff7f137-e736-4af7-99f0-ce4cfaacf538, approvalArtifact:approvalartifact_082caabb-6628-4b0f-b3b5-9c6c5d797b16, workflowRun:workflow_11030d1e-97be-4216-9e68-07bd75ec3f81, planArtifact:planartifact_1c2f112a-a500-4db8-9431-c4e0e2f519dd, reviewArtifact:reviewartifact_e4e97e97-e9f3-4748-820f-2e1f353ab22b, traceArtifact:traceartifact_91ee79af-875a-4f11-b2f6-6b0fbe5b8af1
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_11030d1e-97be-4216-9e68-07bd75ec3f81 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_6ff7f137-e736-4af7-99f0-ce4cfaacf538
- Recent bundle-index artifact paths: docs/agent-bundles/2026-07-08T08-48-56-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_1c2f112a-a500-4db8-9431-c4e0e2f519dd, planartifact_9a6d5b41-0cf8-4dc0-aa55-030fcf4302ff, planartifact_cd3a2c74-3e09-4a12-b22b-911f152609de
- Recent review artifact ids: reviewartifact_e4e97e97-e9f3-4748-820f-2e1f353ab22b, reviewartifact_461c2b75-b09e-4703-ba8a-456e536e17f9, reviewartifact_955df2f1-19ae-4489-8285-158b2b131176
- Recent workflow artifact ids: workflowartifact_3036881f-0dc8-4b91-9044-9125d666434c
- Recent workflow artifact paths: docs/agent-workflows/2026-07-08T08-48-53-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_082caabb-6628-4b0f-b3b5-9c6c5d797b16, approvalartifact_691cf6d8-dcbe-46d6-8c75-dea59f087e17
- Recent approval artifact paths: docs/agent-approvals/2026-07-08T08-48-54-smoke-approval-artifact.md, docs/agent-approvals/2026-07-08T08-48-51-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-07-08T08-48-56-smoke-bundle-index.md
- Recent approval summaries: approval_20648fee-468b-4d9a-8ba2-c296b5b940f3 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_4780677c-37f9-4764-a314-d972a20a1c4c (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_73f4ce79-5a2f-4643-b737-8153273bdcd3 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_91ee79af-875a-4f11-b2f6-6b0fbe5b8af1, traceartifact_fb0e5e43-d6f0-49f0-9f08-11bdbd9ca9cd, traceartifact_839c6c93-f2f7-48b9-8178-6d7f90e5f2c2
- Recent trace artifact paths: docs/agent-traces/2026-07-08T08-48-53-smoke-traces.md, docs/agent-traces/2026-07-08T08-48-51-governance-hold-workflow-traces.md, docs/agent-traces/2026-07-08T08-48-48-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.