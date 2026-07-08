# smoke dashboard

- Generated at: 2026-06-30T02:52:22.733Z
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
- Latest workflow: workflow_e3603be6-06a7-4496-b93e-6227b0e81547 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T02-52-17-governance-hold-workflow.md, docs/agent-plans/2026-06-30T02-52-14-smoke-workflow.md, docs/agent-plans/2026-06-30T02-51-51-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T02-52-17-code-review.md, docs/agent-reviews/2026-06-30T02-52-17-repo-review.md, docs/agent-reviews/2026-06-30T02-52-17-plan-review.md
- Approval requests: approval_78684e10-f411-4372-9a37-a41fd2d2193b (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_0d7d0da1-9575-4c83-bdfe-8aea07d55d8c (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_6aad79ce-3135-4f4f-9ced-396b9f42432f (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T02-52-20-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-52-18-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T02-52-22-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T02-52-19-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_ce7a0f59-1dbe-405a-b030-1ade77c7ae43, approvalRequest:approval_78684e10-f411-4372-9a37-a41fd2d2193b, workflowArtifact:workflowartifact_6b983071-c9d1-4426-92f2-ab178fd2ce63, bundleIndexArtifact:bundleartifact_b77171a1-4941-4707-8d16-0477bc74f826, approvalArtifact:approvalartifact_ce7a0f59-1dbe-405a-b030-1ade77c7ae43, workflowRun:workflow_e3603be6-06a7-4496-b93e-6227b0e81547, planArtifact:planartifact_89a83cbd-e29f-4c3c-92ff-ce9a2ae63e28, reviewArtifact:reviewartifact_88b2d593-54b3-41f7-9f13-4bc3768de4c4, traceArtifact:traceartifact_606b25fe-6ad1-45a6-baec-f8e1be5f00ac
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_e3603be6-06a7-4496-b93e-6227b0e81547 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_b77171a1-4941-4707-8d16-0477bc74f826
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-52-22-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_89a83cbd-e29f-4c3c-92ff-ce9a2ae63e28, planartifact_9767cb83-77cb-4466-91dd-071431d10a0a, planartifact_6b753586-9b45-4c35-b61f-76817e8dc281
- Recent review artifact ids: reviewartifact_88b2d593-54b3-41f7-9f13-4bc3768de4c4, reviewartifact_14e1cd3b-e81d-46cc-8704-ffc5a0ccdac1, reviewartifact_4706007f-2ae8-4e58-932f-cbe9df3c19de
- Recent workflow artifact ids: workflowartifact_6b983071-c9d1-4426-92f2-ab178fd2ce63
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T02-52-19-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_ce7a0f59-1dbe-405a-b030-1ade77c7ae43, approvalartifact_bde0fde5-16c4-48e9-a603-81145b75f0da
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T02-52-20-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-52-18-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-52-22-smoke-bundle-index.md
- Recent approval summaries: approval_78684e10-f411-4372-9a37-a41fd2d2193b (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_0d7d0da1-9575-4c83-bdfe-8aea07d55d8c (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_6aad79ce-3135-4f4f-9ced-396b9f42432f (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_606b25fe-6ad1-45a6-baec-f8e1be5f00ac, traceartifact_17e5752b-4acf-4718-80b3-72b67fa74af3, traceartifact_15becc7b-0aad-4bcb-9176-baa518d59803
- Recent trace artifact paths: docs/agent-traces/2026-06-30T02-52-19-smoke-traces.md, docs/agent-traces/2026-06-30T02-52-17-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T02-52-14-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.