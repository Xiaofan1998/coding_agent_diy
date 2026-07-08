# smoke dashboard

- Generated at: 2026-06-18T02:40:23.997Z
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
- Latest workflow: workflow_68c4af7f-a1b8-4f13-a04c-aaf5a2879e42 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-40-19-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-40-17-smoke-workflow.md, docs/agent-plans/2026-06-18T02-39-58-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-40-19-code-review.md, docs/agent-reviews/2026-06-18T02-40-19-repo-review.md, docs/agent-reviews/2026-06-18T02-40-19-plan-review.md
- Approval requests: approval_498e9e36-3e08-4aa4-80b4-4229e2c3fd3f (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_efb71aef-acbd-4fc6-a3b6-7b1d73693ea0 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_509783e7-0802-4399-b7ba-c8d5cf85d510 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-40-22-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-40-20-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-40-23-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-40-21-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_b9214f74-1b36-404c-9ca5-0557a8c36c32, approvalRequest:approval_498e9e36-3e08-4aa4-80b4-4229e2c3fd3f, workflowArtifact:workflowartifact_3ab4d7d8-5a1b-4a9b-bbbd-a5dc8ac2a9ec, bundleIndexArtifact:bundleartifact_3fc3d279-e0b1-42bf-8399-a8d8719a0cc0, approvalArtifact:approvalartifact_b9214f74-1b36-404c-9ca5-0557a8c36c32, workflowRun:workflow_68c4af7f-a1b8-4f13-a04c-aaf5a2879e42, planArtifact:planartifact_e462d4d6-f0ea-4cfe-abc6-ad32cd96394e, reviewArtifact:reviewartifact_5e09cba5-0943-4bd0-84bb-ed600df948cb, traceArtifact:traceartifact_c7f9a873-736c-4812-b29c-3f52d6ec4618
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_68c4af7f-a1b8-4f13-a04c-aaf5a2879e42 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_3fc3d279-e0b1-42bf-8399-a8d8719a0cc0
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-40-23-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_e462d4d6-f0ea-4cfe-abc6-ad32cd96394e, planartifact_a7c8a756-6ace-4315-8598-1a316dcf6b3f, planartifact_526ea816-5b42-4116-8e33-0702bfa50681
- Recent review artifact ids: reviewartifact_5e09cba5-0943-4bd0-84bb-ed600df948cb, reviewartifact_6f88165f-c3ed-4c67-ac93-9e57654bab34, reviewartifact_9c044edc-22b9-4458-bd37-6736b6daadd9
- Recent workflow artifact ids: workflowartifact_3ab4d7d8-5a1b-4a9b-bbbd-a5dc8ac2a9ec
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-40-21-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_b9214f74-1b36-404c-9ca5-0557a8c36c32, approvalartifact_8fab6cd4-8710-4562-8ab5-03a61588c2e2
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-40-22-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-40-20-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-40-23-smoke-bundle-index.md
- Recent approval summaries: approval_498e9e36-3e08-4aa4-80b4-4229e2c3fd3f (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_efb71aef-acbd-4fc6-a3b6-7b1d73693ea0 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_509783e7-0802-4399-b7ba-c8d5cf85d510 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_c7f9a873-736c-4812-b29c-3f52d6ec4618, traceartifact_cffc8b8c-6ace-4944-839f-824621d0de68, traceartifact_baae39d0-8d32-4156-abbd-5f766d5e7528
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-40-21-smoke-traces.md, docs/agent-traces/2026-06-18T02-40-19-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-40-17-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.