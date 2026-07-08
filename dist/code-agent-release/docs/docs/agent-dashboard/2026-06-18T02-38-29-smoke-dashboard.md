# smoke dashboard

- Generated at: 2026-06-18T02:38:29.347Z
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
- Latest workflow: workflow_a3a40a58-e8a9-452b-94f4-68421f9e865e (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-38-24-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-38-22-smoke-workflow.md, docs/agent-plans/2026-06-18T02-38-03-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-38-25-code-review.md, docs/agent-reviews/2026-06-18T02-38-25-repo-review.md, docs/agent-reviews/2026-06-18T02-38-25-plan-review.md
- Approval requests: approval_f6624454-6b67-4837-aafc-2d60cbde84ea (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_bed339ca-a910-4eba-a4c6-d4edd6683a61 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_c4b3010c-1d56-49ca-b8fd-31e79cf8072e (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-38-27-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-38-25-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-38-29-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-38-26-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_e72cd00b-52b6-4899-8abf-be0376f61b8d, approvalRequest:approval_f6624454-6b67-4837-aafc-2d60cbde84ea, workflowArtifact:workflowartifact_429f7b74-85d4-49e8-ad25-339452bbc9de, bundleIndexArtifact:bundleartifact_dd5708f7-b95b-4edb-a37b-80be4f55ea6c, approvalArtifact:approvalartifact_e72cd00b-52b6-4899-8abf-be0376f61b8d, workflowRun:workflow_a3a40a58-e8a9-452b-94f4-68421f9e865e, planArtifact:planartifact_74d28b5b-e072-4329-9940-7e2333b30994, reviewArtifact:reviewartifact_ba1b76fc-3a10-4348-a674-c9289061a4e0, traceArtifact:traceartifact_2f70396e-4fc3-4056-ae89-f9cc7f7d78a3
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_a3a40a58-e8a9-452b-94f4-68421f9e865e (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_dd5708f7-b95b-4edb-a37b-80be4f55ea6c
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-38-29-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_74d28b5b-e072-4329-9940-7e2333b30994, planartifact_fc7cae13-14ee-41eb-893a-44042074b263, planartifact_3937a289-e50a-4768-a4b7-781abb85103e
- Recent review artifact ids: reviewartifact_ba1b76fc-3a10-4348-a674-c9289061a4e0, reviewartifact_d260f3f0-d07f-4414-9918-588f3b527dc6, reviewartifact_223f989a-0373-4615-aa20-1e7e414972e0
- Recent workflow artifact ids: workflowartifact_429f7b74-85d4-49e8-ad25-339452bbc9de
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-38-26-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_e72cd00b-52b6-4899-8abf-be0376f61b8d, approvalartifact_105a8901-fd92-45de-bb18-2a0b5a949600
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-38-27-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-38-25-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-38-29-smoke-bundle-index.md
- Recent approval summaries: approval_f6624454-6b67-4837-aafc-2d60cbde84ea (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_bed339ca-a910-4eba-a4c6-d4edd6683a61 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_c4b3010c-1d56-49ca-b8fd-31e79cf8072e (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_2f70396e-4fc3-4056-ae89-f9cc7f7d78a3, traceartifact_3ed1e430-056a-49f0-9de6-026cdd3aaf74, traceartifact_7e68c09d-730c-4fb4-ab42-d1d332b294f9
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-38-26-smoke-traces.md, docs/agent-traces/2026-06-18T02-38-25-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-38-22-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.