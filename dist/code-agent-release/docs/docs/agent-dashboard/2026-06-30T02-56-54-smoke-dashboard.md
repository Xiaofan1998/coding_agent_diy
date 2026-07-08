# smoke dashboard

- Generated at: 2026-06-30T02:56:54.690Z
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
- Latest workflow: workflow_6ad01b6c-1644-4cbf-989d-b26969d8143b (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T02-56-49-governance-hold-workflow.md, docs/agent-plans/2026-06-30T02-56-46-smoke-workflow.md, docs/agent-plans/2026-06-30T02-56-22-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T02-56-49-code-review.md, docs/agent-reviews/2026-06-30T02-56-49-repo-review.md, docs/agent-reviews/2026-06-30T02-56-49-plan-review.md
- Approval requests: approval_3f66f4e6-5904-4113-9272-7d75967f6d84 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_0e5b8f92-bbb5-4350-9655-f702d9977d61 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_01ff9fdc-a370-441b-b0c9-621cbbe814d0 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T02-56-52-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-56-50-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T02-56-54-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T02-56-51-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_7da594f0-8702-48ea-8101-453be7dac818, approvalRequest:approval_3f66f4e6-5904-4113-9272-7d75967f6d84, workflowArtifact:workflowartifact_0c787625-de4c-49da-99da-00c88728e71e, bundleIndexArtifact:bundleartifact_4d1f40da-c871-40b2-ad94-f94101ca5dbe, approvalArtifact:approvalartifact_7da594f0-8702-48ea-8101-453be7dac818, workflowRun:workflow_6ad01b6c-1644-4cbf-989d-b26969d8143b, planArtifact:planartifact_3674ce00-2c81-465d-94e8-f2ca98d6ef7e, reviewArtifact:reviewartifact_5772edc4-f952-4e4a-af0a-0d979c448956, traceArtifact:traceartifact_dbd53b3a-f7dd-43d4-bab7-e6fb1402e193
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_6ad01b6c-1644-4cbf-989d-b26969d8143b (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_4d1f40da-c871-40b2-ad94-f94101ca5dbe
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-56-54-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_3674ce00-2c81-465d-94e8-f2ca98d6ef7e, planartifact_288294c0-cc13-46d8-b670-608b75c29a8b, planartifact_3944fbbf-f0e7-463f-bd92-515a550bd9b7
- Recent review artifact ids: reviewartifact_5772edc4-f952-4e4a-af0a-0d979c448956, reviewartifact_113970e8-9ce1-414e-831d-a5164bbb422b, reviewartifact_31859e87-2f71-4454-8698-6f52521507b8
- Recent workflow artifact ids: workflowartifact_0c787625-de4c-49da-99da-00c88728e71e
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T02-56-51-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_7da594f0-8702-48ea-8101-453be7dac818, approvalartifact_acdd4a90-cb25-421e-995f-96c92afb0382
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T02-56-52-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-56-50-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-56-54-smoke-bundle-index.md
- Recent approval summaries: approval_3f66f4e6-5904-4113-9272-7d75967f6d84 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_0e5b8f92-bbb5-4350-9655-f702d9977d61 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_01ff9fdc-a370-441b-b0c9-621cbbe814d0 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_dbd53b3a-f7dd-43d4-bab7-e6fb1402e193, traceartifact_37700e78-122b-46ad-b477-1ea829145ab3, traceartifact_2eae75a8-c12f-4c33-b575-70a6dba925e1
- Recent trace artifact paths: docs/agent-traces/2026-06-30T02-56-51-smoke-traces.md, docs/agent-traces/2026-06-30T02-56-49-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T02-56-46-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.