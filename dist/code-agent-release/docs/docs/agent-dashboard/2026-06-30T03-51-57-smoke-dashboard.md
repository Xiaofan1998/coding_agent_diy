# smoke dashboard

- Generated at: 2026-06-30T03:51:57.055Z
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
- Latest workflow: workflow_bd65494b-2a7a-4d50-933a-cc3f68cdf88b (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T03-51-52-governance-hold-workflow.md, docs/agent-plans/2026-06-30T03-51-48-smoke-workflow.md, docs/agent-plans/2026-06-30T03-51-23-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T03-51-52-code-review.md, docs/agent-reviews/2026-06-30T03-51-52-repo-review.md, docs/agent-reviews/2026-06-30T03-51-52-plan-review.md
- Approval requests: approval_9d861b7c-95bc-45ff-8132-f4bc41e9c22d (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_f7525d90-fbdf-4cf2-9f2e-f35ee0955723 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_1f5ea9f7-8631-4e6c-b35b-c38ed2ad3843 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T03-51-55-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T03-51-52-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T03-51-56-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T03-51-53-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_b91c9f8b-8f16-4b0b-9c11-c55dce8c4d96, approvalRequest:approval_9d861b7c-95bc-45ff-8132-f4bc41e9c22d, workflowArtifact:workflowartifact_c72beecc-a9e9-4b93-aa38-ca8c1d3bc678, bundleIndexArtifact:bundleartifact_c1f170f5-6ae1-45bf-bed2-9d9d24da33a4, approvalArtifact:approvalartifact_b91c9f8b-8f16-4b0b-9c11-c55dce8c4d96, workflowRun:workflow_bd65494b-2a7a-4d50-933a-cc3f68cdf88b, planArtifact:planartifact_ee0df386-3772-4aa9-abbf-a613c9499586, reviewArtifact:reviewartifact_22867313-f5b5-406b-9b18-11ec5d3e61de, traceArtifact:traceartifact_d3b753cd-b058-41dd-bcad-8c89a63a62bd
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_bd65494b-2a7a-4d50-933a-cc3f68cdf88b (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_c1f170f5-6ae1-45bf-bed2-9d9d24da33a4
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T03-51-56-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_ee0df386-3772-4aa9-abbf-a613c9499586, planartifact_507faa95-9c1a-49ae-a1ac-3bb4aca9297c, planartifact_50cfa09c-f836-465a-b0a0-44549fc20b6e
- Recent review artifact ids: reviewartifact_22867313-f5b5-406b-9b18-11ec5d3e61de, reviewartifact_409461f0-01ab-4951-85ce-20b2d4d0442c, reviewartifact_8fca5863-3a80-44fc-bac2-f172ae9ef41d
- Recent workflow artifact ids: workflowartifact_c72beecc-a9e9-4b93-aa38-ca8c1d3bc678
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T03-51-53-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_b91c9f8b-8f16-4b0b-9c11-c55dce8c4d96, approvalartifact_85fe0151-1107-4750-bfba-fba951badf6c
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T03-51-55-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T03-51-52-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T03-51-56-smoke-bundle-index.md
- Recent approval summaries: approval_9d861b7c-95bc-45ff-8132-f4bc41e9c22d (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_f7525d90-fbdf-4cf2-9f2e-f35ee0955723 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_1f5ea9f7-8631-4e6c-b35b-c38ed2ad3843 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_d3b753cd-b058-41dd-bcad-8c89a63a62bd, traceartifact_96b74f26-beda-4f00-94d3-b543648ee3a7, traceartifact_2862c26e-c0ba-4cfb-a667-8601562a7eff
- Recent trace artifact paths: docs/agent-traces/2026-06-30T03-51-54-smoke-traces.md, docs/agent-traces/2026-06-30T03-51-52-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T03-51-48-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.