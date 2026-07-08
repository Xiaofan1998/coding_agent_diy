# smoke dashboard

- Generated at: 2026-06-18T02:41:28.005Z
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
- Latest workflow: workflow_40e1e1ff-7a66-4096-82dc-c75336806eb9 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-41-24-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-41-21-smoke-workflow.md, docs/agent-plans/2026-06-18T02-41-01-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-41-24-code-review.md, docs/agent-reviews/2026-06-18T02-41-24-repo-review.md, docs/agent-reviews/2026-06-18T02-41-24-plan-review.md
- Approval requests: approval_3fd7a32e-05e0-4e72-8ac6-81d824b9e53d (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_c345b450-78c0-4f03-897e-ac8f049eb184 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_7cf2fa85-0068-46af-9991-d7f129ed0f16 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-41-26-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-41-24-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-41-27-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-41-25-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_9b9309c9-1ee8-47db-9bd7-fc0081903d38, approvalRequest:approval_3fd7a32e-05e0-4e72-8ac6-81d824b9e53d, workflowArtifact:workflowartifact_b150091e-ed8d-4024-a543-00ab3abcf166, bundleIndexArtifact:bundleartifact_7dbf12bc-3f94-4837-99be-6541b6a2450f, approvalArtifact:approvalartifact_9b9309c9-1ee8-47db-9bd7-fc0081903d38, workflowRun:workflow_40e1e1ff-7a66-4096-82dc-c75336806eb9, planArtifact:planartifact_aa5ac5cf-636c-4ce3-a57d-4840e2c8796b, reviewArtifact:reviewartifact_4a08f566-1974-4832-a8ad-9274a1f93a31, traceArtifact:traceartifact_3fdb231f-7b2f-4db6-b861-25c1fcb179e6
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_40e1e1ff-7a66-4096-82dc-c75336806eb9 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_7dbf12bc-3f94-4837-99be-6541b6a2450f
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-41-27-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_aa5ac5cf-636c-4ce3-a57d-4840e2c8796b, planartifact_fa1994ec-b286-4aa3-8119-89fed3f016fd, planartifact_d40b308f-1c7e-4c0a-9a6a-6bedc0147929
- Recent review artifact ids: reviewartifact_4a08f566-1974-4832-a8ad-9274a1f93a31, reviewartifact_6fe80ed5-8298-4473-9307-6c9cfd6d9043, reviewartifact_6ca256ff-2d4c-404f-bf1d-07116f3bcf40
- Recent workflow artifact ids: workflowartifact_b150091e-ed8d-4024-a543-00ab3abcf166
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-41-25-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_9b9309c9-1ee8-47db-9bd7-fc0081903d38, approvalartifact_730a04ee-d5cd-4bcc-97e9-24eadb76d2f0
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-41-26-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-41-24-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-41-27-smoke-bundle-index.md
- Recent approval summaries: approval_3fd7a32e-05e0-4e72-8ac6-81d824b9e53d (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_c345b450-78c0-4f03-897e-ac8f049eb184 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_7cf2fa85-0068-46af-9991-d7f129ed0f16 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_3fdb231f-7b2f-4db6-b861-25c1fcb179e6, traceartifact_c5cc3cec-efdd-40f4-96d3-343dca5c225d, traceartifact_2e2177d4-7cc8-4117-a972-2a8d2d9db01a
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-41-25-smoke-traces.md, docs/agent-traces/2026-06-18T02-41-24-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-41-21-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.