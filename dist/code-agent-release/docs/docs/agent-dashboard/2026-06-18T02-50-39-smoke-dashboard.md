# smoke dashboard

- Generated at: 2026-06-18T02:50:39.738Z
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
- Latest workflow: workflow_6893082e-7d24-4e60-8730-40eaa4343897 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-50-34-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-50-31-smoke-workflow.md, docs/agent-plans/2026-06-18T02-50-10-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-50-34-code-review.md, docs/agent-reviews/2026-06-18T02-50-34-repo-review.md, docs/agent-reviews/2026-06-18T02-50-34-plan-review.md
- Approval requests: approval_e98c94b1-7809-47f4-8d03-a9e8954caa5d (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_c221e7bd-ed30-4022-906f-70b41206a4c2 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_fd6747a7-6504-4a91-ab08-3bb5640da005 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-50-37-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-50-34-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-50-39-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-50-35-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_2997ce7a-3cfd-4815-b9c5-4ef86c981bd8, approvalRequest:approval_e98c94b1-7809-47f4-8d03-a9e8954caa5d, workflowArtifact:workflowartifact_0b2a17df-2cfb-4472-822a-8b0c2197b346, bundleIndexArtifact:bundleartifact_0aa1350e-abb8-44ec-b715-2d221b431c68, approvalArtifact:approvalartifact_2997ce7a-3cfd-4815-b9c5-4ef86c981bd8, workflowRun:workflow_6893082e-7d24-4e60-8730-40eaa4343897, planArtifact:planartifact_06cbefba-2be5-43c7-9c13-12045ad54a68, reviewArtifact:reviewartifact_5369c031-a0d1-45eb-86dc-23f98622d7e5, traceArtifact:traceartifact_07d96448-71e6-42eb-9ccd-504ba1d4ff68
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_6893082e-7d24-4e60-8730-40eaa4343897 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_0aa1350e-abb8-44ec-b715-2d221b431c68
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-50-39-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_06cbefba-2be5-43c7-9c13-12045ad54a68, planartifact_9559452a-d78c-4107-a185-ffd7aecf2ad6, planartifact_d4040f87-3ff3-4dd9-8edd-7f73a6f6d6b2
- Recent review artifact ids: reviewartifact_5369c031-a0d1-45eb-86dc-23f98622d7e5, reviewartifact_689f400c-7fe9-47de-ad1e-778f7bd95407, reviewartifact_508cf666-9fc9-4f9e-8f60-41a3757acee9
- Recent workflow artifact ids: workflowartifact_0b2a17df-2cfb-4472-822a-8b0c2197b346
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-50-35-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_2997ce7a-3cfd-4815-b9c5-4ef86c981bd8, approvalartifact_b82ac042-524f-4718-aaa5-f20dc1dc9c6a
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-50-37-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-50-34-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-50-39-smoke-bundle-index.md
- Recent approval summaries: approval_e98c94b1-7809-47f4-8d03-a9e8954caa5d (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_c221e7bd-ed30-4022-906f-70b41206a4c2 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_fd6747a7-6504-4a91-ab08-3bb5640da005 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_07d96448-71e6-42eb-9ccd-504ba1d4ff68, traceartifact_1ee2db19-870b-40e3-afe6-6a002d8a02bf, traceartifact_6deba88b-1c4c-4194-bc1f-60c3a28526cb
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-50-36-smoke-traces.md, docs/agent-traces/2026-06-18T02-50-34-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-50-31-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.