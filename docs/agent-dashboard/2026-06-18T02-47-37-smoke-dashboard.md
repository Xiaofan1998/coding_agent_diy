# smoke dashboard

- Generated at: 2026-06-18T02:47:37.882Z
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
- Latest workflow: workflow_5c131bf2-cc0e-477c-b83a-fdc595792ad5 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-47-30-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-47-26-smoke-workflow.md, docs/agent-plans/2026-06-18T02-46-54-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-47-31-code-review.md, docs/agent-reviews/2026-06-18T02-47-31-repo-review.md, docs/agent-reviews/2026-06-18T02-47-31-plan-review.md
- Approval requests: approval_af7ed2f0-937d-479a-8599-3641d37ac6d0 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_37ca4066-c803-4c33-9d33-6b0a7aca4b1c (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_8fc05a2e-59e2-44ec-bda5-a2b5fdeba4ce (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-47-35-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-47-31-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-47-37-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-47-33-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_c7d01154-f493-4b64-ae42-959478f105f7, approvalRequest:approval_af7ed2f0-937d-479a-8599-3641d37ac6d0, workflowArtifact:workflowartifact_1ac45c0c-39af-4714-87c2-2460d9fa3f77, bundleIndexArtifact:bundleartifact_fb90c374-3108-4ad3-a1d8-32a7ff7b6aa6, approvalArtifact:approvalartifact_c7d01154-f493-4b64-ae42-959478f105f7, workflowRun:workflow_5c131bf2-cc0e-477c-b83a-fdc595792ad5, planArtifact:planartifact_6a0be559-ece6-4e10-bac9-cdda897c555c, reviewArtifact:reviewartifact_e9bb9e1a-100d-45ea-9a49-c88ca80c5b9a, traceArtifact:traceartifact_a20edd2d-7d6a-49b1-965f-729237f42b25
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_5c131bf2-cc0e-477c-b83a-fdc595792ad5 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_fb90c374-3108-4ad3-a1d8-32a7ff7b6aa6
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-47-37-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_6a0be559-ece6-4e10-bac9-cdda897c555c, planartifact_20649536-a134-47bd-aae0-533a49232151, planartifact_2a94a97a-c50f-464c-8152-96877183cc12
- Recent review artifact ids: reviewartifact_e9bb9e1a-100d-45ea-9a49-c88ca80c5b9a, reviewartifact_e10266eb-bb47-4883-9ecf-3072b72a9030, reviewartifact_8546db92-7916-42a3-bd12-f2d68151935d
- Recent workflow artifact ids: workflowartifact_1ac45c0c-39af-4714-87c2-2460d9fa3f77
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-47-33-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_c7d01154-f493-4b64-ae42-959478f105f7, approvalartifact_2ab8df3b-14ff-4c62-b496-d697716c22f7
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-47-35-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-47-31-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-47-37-smoke-bundle-index.md
- Recent approval summaries: approval_af7ed2f0-937d-479a-8599-3641d37ac6d0 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_37ca4066-c803-4c33-9d33-6b0a7aca4b1c (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_8fc05a2e-59e2-44ec-bda5-a2b5fdeba4ce (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_a20edd2d-7d6a-49b1-965f-729237f42b25, traceartifact_81167aa0-efd1-4973-bd40-74155dea26bc, traceartifact_0cf961d6-df54-4c31-9329-f1999ef4c9ba
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-47-34-smoke-traces.md, docs/agent-traces/2026-06-18T02-47-31-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-47-26-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.