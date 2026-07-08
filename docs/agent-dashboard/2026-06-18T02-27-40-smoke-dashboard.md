# smoke dashboard

- Generated at: 2026-06-18T02:27:40.178Z
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
- Traces: 48
- Trace artifacts: 3
- Latest workflow: workflow_87e888da-bad0-4f6f-b42c-0aca39f4a336 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-27-36-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-27-33-smoke-workflow.md, docs/agent-plans/2026-06-18T02-27-15-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-27-36-code-review.md, docs/agent-reviews/2026-06-18T02-27-36-repo-review.md, docs/agent-reviews/2026-06-18T02-27-36-plan-review.md
- Approval requests: approval_ff467477-d209-45dc-9132-a9e992b9af73 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_209ed1e7-256f-4e72-b79e-dfe7a3f32600 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_c0d620f4-0212-452e-ae26-7cb022ac48fc (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-27-38-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-27-36-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-27-39-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-27-37-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_62b16257-ae3e-4845-b22d-557ae89d4530, approvalRequest:approval_ff467477-d209-45dc-9132-a9e992b9af73, workflowArtifact:workflowartifact_6db836d4-95ac-4475-9739-b97ba1ace3e9, bundleIndexArtifact:bundleartifact_29166708-e02b-4cb3-bba4-9ca8577410c2, approvalArtifact:approvalartifact_62b16257-ae3e-4845-b22d-557ae89d4530, workflowRun:workflow_87e888da-bad0-4f6f-b42c-0aca39f4a336, planArtifact:planartifact_911adf13-2363-4632-8620-4f98eeafc9ee, reviewArtifact:reviewartifact_abe1e4f0-6151-4fab-a343-8ceda4c1ba31, traceArtifact:traceartifact_03fbcf7e-d561-4757-ba2a-50883ae405ab

## Linked Summaries
- Latest workflow bundle: workflow_87e888da-bad0-4f6f-b42c-0aca39f4a336 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_29166708-e02b-4cb3-bba4-9ca8577410c2
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-27-39-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_911adf13-2363-4632-8620-4f98eeafc9ee, planartifact_93a12f82-e0d6-44e7-befd-e673849c8b53, planartifact_a6695b67-56c3-40bf-ad91-bc643c2e876e
- Recent review artifact ids: reviewartifact_abe1e4f0-6151-4fab-a343-8ceda4c1ba31, reviewartifact_f2ddcfa3-069f-40db-8a3e-5c46cc5b9cb4, reviewartifact_f13d2362-d07a-456a-b705-7df271e63475
- Recent workflow artifact ids: workflowartifact_6db836d4-95ac-4475-9739-b97ba1ace3e9
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-27-37-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_62b16257-ae3e-4845-b22d-557ae89d4530, approvalartifact_ce0958f2-31f7-49ac-bcf0-3afd7a4ce28d
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-27-38-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-27-36-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-27-39-smoke-bundle-index.md
- Recent approval summaries: approval_ff467477-d209-45dc-9132-a9e992b9af73 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_209ed1e7-256f-4e72-b79e-dfe7a3f32600 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_c0d620f4-0212-452e-ae26-7cb022ac48fc (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_03fbcf7e-d561-4757-ba2a-50883ae405ab, traceartifact_c9d5269f-ddbe-4ba5-9ba4-a7a4bcae353c, traceartifact_21ec3c3a-5c77-4f98-a204-87f62ad8650c
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-27-37-smoke-traces.md, docs/agent-traces/2026-06-18T02-27-36-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-27-34-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.