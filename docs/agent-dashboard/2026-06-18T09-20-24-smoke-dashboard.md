# smoke dashboard

- Generated at: 2026-06-18T09:20:24.013Z
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
- Traces: 58
- Trace artifacts: 3
- Latest workflow: workflow_9b6b9753-073b-48b8-9c7b-409003e94df0 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T09-20-18-governance-hold-workflow.md, docs/agent-plans/2026-06-18T09-19-55-smoke-workflow.md, docs/agent-plans/2026-06-18T09-19-16-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T09-20-18-code-review.md, docs/agent-reviews/2026-06-18T09-20-18-repo-review.md, docs/agent-reviews/2026-06-18T09-20-18-plan-review.md
- Approval requests: approval_76b0ac3b-fd8d-4840-ba0b-bf012e62b54f (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_78bd6412-4f66-440e-95df-bf290f2a72fb (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_d73d62cb-2d6b-4375-85f5-b2040e0e98b3 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T09-20-21-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T09-20-18-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T09-20-23-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T09-20-20-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_452cf153-22b3-4103-a294-75c1c61dacda, approvalRequest:approval_76b0ac3b-fd8d-4840-ba0b-bf012e62b54f, workflowArtifact:workflowartifact_c20e0545-2fe2-4562-9d6d-6a8363eae9d6, bundleIndexArtifact:bundleartifact_c35ed268-ec54-440e-880b-21d8dc23d640, approvalArtifact:approvalartifact_452cf153-22b3-4103-a294-75c1c61dacda, workflowRun:workflow_9b6b9753-073b-48b8-9c7b-409003e94df0, planArtifact:planartifact_f2bc9c1b-7585-47a6-8eea-6c6fa866abb0, reviewArtifact:reviewartifact_ffcd40d3-f4f3-4deb-9749-7c874f92c61a, traceArtifact:traceartifact_a8f079ec-5e38-48f5-ba78-a4bdf5608dd5
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_9b6b9753-073b-48b8-9c7b-409003e94df0 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_c35ed268-ec54-440e-880b-21d8dc23d640
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T09-20-23-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_f2bc9c1b-7585-47a6-8eea-6c6fa866abb0, planartifact_e525b5f1-484c-4405-9910-a004e2d4805e, planartifact_71afe97e-95c0-4dc2-b6bf-8636fdc60d58
- Recent review artifact ids: reviewartifact_ffcd40d3-f4f3-4deb-9749-7c874f92c61a, reviewartifact_1babdba3-e521-4841-ba3f-a23bbdc8538f, reviewartifact_0fb6d5eb-04f5-4856-9d93-0c3542fcb110
- Recent workflow artifact ids: workflowartifact_c20e0545-2fe2-4562-9d6d-6a8363eae9d6
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T09-20-20-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_452cf153-22b3-4103-a294-75c1c61dacda, approvalartifact_34549c7b-7363-4070-a4af-c2983a078d18
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T09-20-21-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T09-20-18-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T09-20-23-smoke-bundle-index.md
- Recent approval summaries: approval_76b0ac3b-fd8d-4840-ba0b-bf012e62b54f (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_78bd6412-4f66-440e-95df-bf290f2a72fb (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_d73d62cb-2d6b-4375-85f5-b2040e0e98b3 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_a8f079ec-5e38-48f5-ba78-a4bdf5608dd5, traceartifact_aee326e8-b1d8-4903-9ffe-ba81a4d91f92, traceartifact_b764c30b-8739-4982-a6cb-29b004ce7785
- Recent trace artifact paths: docs/agent-traces/2026-06-18T09-20-20-smoke-traces.md, docs/agent-traces/2026-06-18T09-20-18-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T09-19-56-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.