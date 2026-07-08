# smoke dashboard

- Generated at: 2026-06-18T02:26:49.095Z
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
- Latest workflow: workflow_bf704d01-294a-4873-aa91-dac9f6cb6162 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-26-45-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-26-42-smoke-workflow.md, docs/agent-plans/2026-06-18T02-26-23-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-26-45-code-review.md, docs/agent-reviews/2026-06-18T02-26-45-repo-review.md, docs/agent-reviews/2026-06-18T02-26-45-plan-review.md
- Approval requests: approval_a777a363-0e70-4604-810f-5e97504ce42f (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_4abee8e5-aeba-42c2-bc9b-89e5a98967b9 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_11e5fe23-2d1b-4f18-a7ef-74fe01593f85 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-26-47-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-26-45-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-26-48-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-26-46-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_7e59521f-95b2-4614-ba9a-63b3cce8acd0, approvalRequest:approval_a777a363-0e70-4604-810f-5e97504ce42f, workflowArtifact:workflowartifact_3151c022-6490-400a-9ea8-352e90b7a252, bundleIndexArtifact:bundleartifact_47b0cf7b-c804-40fc-a74b-eeb956a23543, approvalArtifact:approvalartifact_7e59521f-95b2-4614-ba9a-63b3cce8acd0, workflowRun:workflow_bf704d01-294a-4873-aa91-dac9f6cb6162, planArtifact:planartifact_2eacaea4-3d33-4f67-b410-2a84e11ff840, reviewArtifact:reviewartifact_ba47a5fb-c881-40b8-bdac-e2fd9e3dfbc6, traceArtifact:traceartifact_8ee9cf3e-ae70-490e-a5bf-52806d607645

## Linked Summaries
- Latest workflow bundle: workflow_bf704d01-294a-4873-aa91-dac9f6cb6162 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_47b0cf7b-c804-40fc-a74b-eeb956a23543
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-26-48-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_2eacaea4-3d33-4f67-b410-2a84e11ff840, planartifact_70c4b0b0-c994-4e97-a69b-53827fd874b7, planartifact_debf029b-2672-4c84-a8d4-5acfe70f0090
- Recent review artifact ids: reviewartifact_ba47a5fb-c881-40b8-bdac-e2fd9e3dfbc6, reviewartifact_942f6af0-df21-48f4-9991-1ceaef9620e8, reviewartifact_296dd819-e8c9-4302-924e-0cf73165fb2e
- Recent workflow artifact ids: workflowartifact_3151c022-6490-400a-9ea8-352e90b7a252
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-26-46-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_7e59521f-95b2-4614-ba9a-63b3cce8acd0, approvalartifact_41655acb-f576-4a3f-b1ed-3f73ef93560d
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-26-47-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-26-45-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-26-48-smoke-bundle-index.md
- Recent approval summaries: approval_a777a363-0e70-4604-810f-5e97504ce42f (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_4abee8e5-aeba-42c2-bc9b-89e5a98967b9 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_11e5fe23-2d1b-4f18-a7ef-74fe01593f85 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_8ee9cf3e-ae70-490e-a5bf-52806d607645, traceartifact_2336ebf8-d342-4445-b69f-64fade12d50d, traceartifact_0016223f-77cd-44a2-afb7-dbe0a20cf2b5
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-26-46-smoke-traces.md, docs/agent-traces/2026-06-18T02-26-45-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-26-42-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.