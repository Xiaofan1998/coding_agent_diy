# smoke dashboard

- Generated at: 2026-06-18T02:44:02.748Z
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
- Latest workflow: workflow_b27f09f7-ce4b-408f-bb59-9dc7fcf764cd (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-43-58-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-43-56-smoke-workflow.md, docs/agent-plans/2026-06-18T02-43-36-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-43-58-code-review.md, docs/agent-reviews/2026-06-18T02-43-58-repo-review.md, docs/agent-reviews/2026-06-18T02-43-58-plan-review.md
- Approval requests: approval_f0c8ab4c-63fa-4e32-9155-ccd510252629 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_519b4a0d-703e-44ba-92c4-eff67c5c6f22 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_bf9e4d80-cbf0-431a-8255-a32f1b234fd1 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-44-01-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-43-58-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-44-02-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-43-59-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_6b13bb15-c7c6-4b28-85bc-4c9703d9c94d, approvalRequest:approval_f0c8ab4c-63fa-4e32-9155-ccd510252629, workflowArtifact:workflowartifact_67074bd5-2871-4638-9e9a-c42603e5a78a, bundleIndexArtifact:bundleartifact_5245d3d1-2eb2-4d4a-84a3-963ce956d5e8, approvalArtifact:approvalartifact_6b13bb15-c7c6-4b28-85bc-4c9703d9c94d, workflowRun:workflow_b27f09f7-ce4b-408f-bb59-9dc7fcf764cd, planArtifact:planartifact_8bbee31d-1057-486b-bafc-2156b976a87c, reviewArtifact:reviewartifact_c1d55ba2-7f0a-42b1-8ff3-f094ee57792a, traceArtifact:traceartifact_d2f4a75a-ee98-4a80-ae75-f7ae379944d8
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_b27f09f7-ce4b-408f-bb59-9dc7fcf764cd (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_5245d3d1-2eb2-4d4a-84a3-963ce956d5e8
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-44-02-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_8bbee31d-1057-486b-bafc-2156b976a87c, planartifact_396f4159-ee9c-4b2c-bfec-ee9a408b756f, planartifact_9caf8334-1d4e-4f8a-980c-ace15c887bfb
- Recent review artifact ids: reviewartifact_c1d55ba2-7f0a-42b1-8ff3-f094ee57792a, reviewartifact_04f06333-b941-4981-a4b0-184516efa6b4, reviewartifact_5030849a-9427-4e65-9fb8-a472cde42abf
- Recent workflow artifact ids: workflowartifact_67074bd5-2871-4638-9e9a-c42603e5a78a
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-43-59-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_6b13bb15-c7c6-4b28-85bc-4c9703d9c94d, approvalartifact_3e4f6eb0-d2b6-4ae5-9a59-e3b1f981f996
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-44-01-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-43-58-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-44-02-smoke-bundle-index.md
- Recent approval summaries: approval_f0c8ab4c-63fa-4e32-9155-ccd510252629 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_519b4a0d-703e-44ba-92c4-eff67c5c6f22 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_bf9e4d80-cbf0-431a-8255-a32f1b234fd1 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_d2f4a75a-ee98-4a80-ae75-f7ae379944d8, traceartifact_f24f8c7e-825f-44a3-b061-8fafcf417026, traceartifact_92de7439-87cb-4292-807c-d2224c09f4fe
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-44-00-smoke-traces.md, docs/agent-traces/2026-06-18T02-43-58-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-43-56-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.