# smoke dashboard

- Generated at: 2026-06-30T02:49:31.437Z
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
- Latest workflow: workflow_05224085-65ea-401e-8d55-56de71ecee74 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-30T02-49-25-governance-hold-workflow.md, docs/agent-plans/2026-06-30T02-49-22-smoke-workflow.md, docs/agent-plans/2026-06-30T02-48-58-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-30T02-49-26-code-review.md, docs/agent-reviews/2026-06-30T02-49-26-repo-review.md, docs/agent-reviews/2026-06-30T02-49-26-plan-review.md
- Approval requests: approval_a509a50f-97c9-4568-ae17-b5f8ea45db16 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_ba087e99-d3a1-44e9-abaa-af94ca8293bb (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_a6ca76fa-f4b8-4323-a17f-f58385204182 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-30T02-49-29-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-49-26-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-30T02-49-31-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-30T02-49-27-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_9a9a2ab2-6051-4748-bd9e-137eacecc25d, approvalRequest:approval_a509a50f-97c9-4568-ae17-b5f8ea45db16, workflowArtifact:workflowartifact_409e2fe0-9781-4ac3-ae82-7c929fc33fe0, bundleIndexArtifact:bundleartifact_24621f13-cc69-4420-8343-c05b083f27f1, approvalArtifact:approvalartifact_9a9a2ab2-6051-4748-bd9e-137eacecc25d, workflowRun:workflow_05224085-65ea-401e-8d55-56de71ecee74, planArtifact:planartifact_f709d4de-3680-4f42-93cc-8f8d571d4ad7, reviewArtifact:reviewartifact_442b1855-7354-4547-bd97-85a386307135, traceArtifact:traceartifact_98dd1d2d-ce1c-4927-9582-c629ea29bbab
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_05224085-65ea-401e-8d55-56de71ecee74 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_24621f13-cc69-4420-8343-c05b083f27f1
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-49-31-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_f709d4de-3680-4f42-93cc-8f8d571d4ad7, planartifact_4a47f131-b704-482b-a545-3428ff59a9c3, planartifact_f0adfab1-4f98-44fb-b339-3e0e9e3d64c0
- Recent review artifact ids: reviewartifact_442b1855-7354-4547-bd97-85a386307135, reviewartifact_3cb061df-40eb-48c0-989e-e44b5ceb197a, reviewartifact_dd4cd5be-650e-4606-97ef-8bf1b6d1dc6e
- Recent workflow artifact ids: workflowartifact_409e2fe0-9781-4ac3-ae82-7c929fc33fe0
- Recent workflow artifact paths: docs/agent-workflows/2026-06-30T02-49-27-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_9a9a2ab2-6051-4748-bd9e-137eacecc25d, approvalartifact_5d4f4331-f95a-49a6-97d7-9ef514e1029a
- Recent approval artifact paths: docs/agent-approvals/2026-06-30T02-49-29-smoke-approval-artifact.md, docs/agent-approvals/2026-06-30T02-49-26-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-30T02-49-31-smoke-bundle-index.md
- Recent approval summaries: approval_a509a50f-97c9-4568-ae17-b5f8ea45db16 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_ba087e99-d3a1-44e9-abaa-af94ca8293bb (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_a6ca76fa-f4b8-4323-a17f-f58385204182 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_98dd1d2d-ce1c-4927-9582-c629ea29bbab, traceartifact_e28ff2d8-bc47-4dba-9b3a-276c28deda0a, traceartifact_b7626b7c-c9a3-434c-98d7-f5cbd6938db5
- Recent trace artifact paths: docs/agent-traces/2026-06-30T02-49-28-smoke-traces.md, docs/agent-traces/2026-06-30T02-49-26-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-30T02-49-22-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.