# smoke dashboard

- Generated at: 2026-06-17T14:54:12.208Z
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
- Latest workflow: workflow_4f546093-3b52-4b2a-8b32-41696dbfb9b7 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-17T14-54-04-governance-hold-workflow.md, docs/agent-plans/2026-06-17T14-53-58-smoke-workflow.md, docs/agent-plans/2026-06-17T14-53-15-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-17T14-54-04-code-review.md, docs/agent-reviews/2026-06-17T14-54-04-repo-review.md, docs/agent-reviews/2026-06-17T14-54-04-plan-review.md
- Approval requests: approval_c5077af3-5c55-437e-8ce7-25271b5e7b86 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_8de1f4c4-e527-4dde-94a8-ff363266190b (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_2a4205b2-c0b0-4574-8a16-6a42fd7af5e8 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-17T14-54-09-smoke-approval-artifact.md, docs/agent-approvals/2026-06-17T14-54-04-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-17T14-54-11-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-17T14-54-06-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, list_workflow_bundles
- Suggested next reads: approvalArtifact:approvalartifact_39c6ce07-9404-4d35-a7a7-3c6bd34734b2, approvalRequest:approval_c5077af3-5c55-437e-8ce7-25271b5e7b86, workflowArtifact:workflowartifact_ac403225-a960-4c51-b2bf-569bd9533c4d, bundleIndexArtifact:bundleartifact_d5819c27-c40f-4729-83f6-84dd8a33d2ec, approvalArtifact:approvalartifact_39c6ce07-9404-4d35-a7a7-3c6bd34734b2, workflowRun:workflow_4f546093-3b52-4b2a-8b32-41696dbfb9b7, planArtifact:planartifact_ccb20694-6c13-4d56-8314-d0e33ffedb02, reviewArtifact:reviewartifact_14ba535b-3b2c-4ae8-a049-264e68366685, traceArtifact:traceartifact_02ca6e68-1c3b-47f4-a7b8-1fd1dedabf58

## Linked Summaries
- Latest workflow bundle: workflow_4f546093-3b52-4b2a-8b32-41696dbfb9b7 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_d5819c27-c40f-4729-83f6-84dd8a33d2ec
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-17T14-54-11-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_ccb20694-6c13-4d56-8314-d0e33ffedb02, planartifact_d984bdda-6edc-4889-9e3b-236b70f9e694, planartifact_7a2b8fda-24c3-4b10-a5a7-9faef82ab950
- Recent review artifact ids: reviewartifact_14ba535b-3b2c-4ae8-a049-264e68366685, reviewartifact_2855f33b-6fb2-4325-8ab7-440b5f80eb78, reviewartifact_b402af40-6eab-4a41-86a2-e34543ccec43
- Recent workflow artifact ids: workflowartifact_ac403225-a960-4c51-b2bf-569bd9533c4d
- Recent workflow artifact paths: docs/agent-workflows/2026-06-17T14-54-06-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_39c6ce07-9404-4d35-a7a7-3c6bd34734b2, approvalartifact_1f3f5b4d-3bce-4942-af2c-57a36b937e10
- Recent approval artifact paths: docs/agent-approvals/2026-06-17T14-54-09-smoke-approval-artifact.md, docs/agent-approvals/2026-06-17T14-54-04-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-17T14-54-11-smoke-bundle-index.md
- Recent approval summaries: approval_c5077af3-5c55-437e-8ce7-25271b5e7b86 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_8de1f4c4-e527-4dde-94a8-ff363266190b (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_2a4205b2-c0b0-4574-8a16-6a42fd7af5e8 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_02ca6e68-1c3b-47f4-a7b8-1fd1dedabf58, traceartifact_b049a5ea-7367-44d1-a8c5-62e941699774, traceartifact_01ebb94f-4ec6-4946-9c55-bc4f7254ec0c
- Recent trace artifact paths: docs/agent-traces/2026-06-17T14-54-07-smoke-traces.md, docs/agent-traces/2026-06-17T14-54-04-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-17T14-53-59-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.