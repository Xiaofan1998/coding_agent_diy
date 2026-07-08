# smoke dashboard

- Generated at: 2026-06-30T02:50:58.332Z
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
- Latest workflow: workflow_b53e631b-6375-42d7-a4b5-7b1929fd6228 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T02-50-53-governance-hold-workflow.md, docs/agent-plans/2026-06-30T02-50-50-smoke-workflow.md, docs/agent-plans/2026-06-30T02-50-26-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T02-50-53-code-review.md, docs/agent-reviews/2026-06-30T02-50-53-repo-review.md, docs/agent-reviews/2026-06-30T02-50-53-plan-review.md
- Approval requests: approval_20e3030e-9827-40bd-a9b2-115c6689b383 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_45ae0c25-b530-4b87-8422-9212ce8d803b (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_9321e278-dae3-4f1d-84dd-c0fc24d70e26 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T02-50-56-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-50-53-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T02-50-58-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T02-50-55-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_0591ec9e-f603-4803-8fa3-888158acfeb3, approvalRequest:approval_20e3030e-9827-40bd-a9b2-115c6689b383, workflowArtifact:workflowartifact_107fdc6c-4852-4db4-8625-1dfecad26588, bundleIndexArtifact:bundleartifact_9f7065c5-7f68-4df4-b2bf-01e9bcc8117b, approvalArtifact:approvalartifact_0591ec9e-f603-4803-8fa3-888158acfeb3, workflowRun:workflow_b53e631b-6375-42d7-a4b5-7b1929fd6228, planArtifact:planartifact_9c1bd43c-9d82-4efb-9124-cb7fd4684fb9, reviewArtifact:reviewartifact_384e47a0-def3-4a62-808f-3c3091868e7e, traceArtifact:traceartifact_a43b9d74-f63f-46a6-b053-3a4977512ea4
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_b53e631b-6375-42d7-a4b5-7b1929fd6228 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_9f7065c5-7f68-4df4-b2bf-01e9bcc8117b
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-50-58-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_9c1bd43c-9d82-4efb-9124-cb7fd4684fb9, planartifact_b0689810-f3c0-4fd8-bc1e-9e6cf9913cb4, planartifact_6ae9b268-a7a3-4fd6-afca-ad9abdd72cbf
- Recent review artifact ids: reviewartifact_384e47a0-def3-4a62-808f-3c3091868e7e, reviewartifact_58a13396-b328-41cc-86fe-8a1af924bf1c, reviewartifact_cffafdb0-a525-421d-a2c4-526543f422fa
- Recent workflow artifact ids: workflowartifact_107fdc6c-4852-4db4-8625-1dfecad26588
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T02-50-55-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_0591ec9e-f603-4803-8fa3-888158acfeb3, approvalartifact_2a79f30e-a435-486f-accf-7f2264482611
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T02-50-56-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-50-53-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-50-58-smoke-bundle-index.md
- Recent approval summaries: approval_20e3030e-9827-40bd-a9b2-115c6689b383 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_45ae0c25-b530-4b87-8422-9212ce8d803b (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_9321e278-dae3-4f1d-84dd-c0fc24d70e26 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_a43b9d74-f63f-46a6-b053-3a4977512ea4, traceartifact_95e65321-5235-4b2b-aa80-22bef2cba868, traceartifact_fb44b6b8-22e3-4071-92d9-4c12e21f32c1
- Recent trace artifact paths: docs/agent-traces/2026-06-30T02-50-55-smoke-traces.md, docs/agent-traces/2026-06-30T02-50-53-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T02-50-50-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.