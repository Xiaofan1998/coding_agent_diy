# smoke dashboard

- Generated at: 2026-06-18T02:34:33.130Z
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
- Latest workflow: workflow_af182cbe-209c-4a72-ad42-c0a7c349526e (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-18T02-34-29-governance-hold-workflow.md, docs/agent-plans/2026-06-18T02-34-26-smoke-workflow.md, docs/agent-plans/2026-06-18T02-34-04-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-18T02-34-29-code-review.md, docs/agent-reviews/2026-06-18T02-34-29-repo-review.md, docs/agent-reviews/2026-06-18T02-34-29-plan-review.md
- Approval requests: approval_fdd70eae-a14e-41a3-9865-a32d2be80b05 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_d7c69dec-7878-494a-86ac-5d5c9ac469b3 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_dd1dbf01-6da6-4e29-b785-3d9aa6505a31 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-18T02-34-31-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-34-29-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-18T02-34-32-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-18T02-34-30-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_76ecafd1-9c3b-4fc2-9c8d-01050c012be1, approvalRequest:approval_fdd70eae-a14e-41a3-9865-a32d2be80b05, workflowArtifact:workflowartifact_e7a63285-f53a-4a72-b1ef-a6e1857ab012, bundleIndexArtifact:bundleartifact_cbbf328e-f9c1-4068-bc0f-8cfb3bb7a08d, approvalArtifact:approvalartifact_76ecafd1-9c3b-4fc2-9c8d-01050c012be1, workflowRun:workflow_af182cbe-209c-4a72-ad42-c0a7c349526e, planArtifact:planartifact_7cbc24a5-0304-4978-b449-1ca52a0bf6ab, reviewArtifact:reviewartifact_ff90fc63-ee91-47f3-8cbc-0bd9eabc3c23, traceArtifact:traceartifact_d0534fdf-cd82-4ce0-997f-bfc297860216
- Recommended actions: Resolve approvals [approvals list], Review subagent outputs [subagents summary], Focus plan item 1 [plan summary], Inspect workflow hold [workflow list]

## Linked Summaries
- Latest workflow bundle: workflow_af182cbe-209c-4a72-ad42-c0a7c349526e (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_cbbf328e-f9c1-4068-bc0f-8cfb3bb7a08d
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-34-32-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_7cbc24a5-0304-4978-b449-1ca52a0bf6ab, planartifact_cb04e457-3e27-44ef-8030-35fc5f895f8f, planartifact_790405e4-5b30-46af-9a45-a7511cd0866b
- Recent review artifact ids: reviewartifact_ff90fc63-ee91-47f3-8cbc-0bd9eabc3c23, reviewartifact_6f9145e5-ca8b-40df-bf70-f54ca822c113, reviewartifact_3becd270-d76b-44c7-a0c8-b4c0f9a27833
- Recent workflow artifact ids: workflowartifact_e7a63285-f53a-4a72-b1ef-a6e1857ab012
- Recent workflow artifact paths: docs/agent-workflows/2026-06-18T02-34-30-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_76ecafd1-9c3b-4fc2-9c8d-01050c012be1, approvalartifact_ee434ca5-dae5-47ad-8a26-c51a4e9c3860
- Recent approval artifact paths: docs/agent-approvals/2026-06-18T02-34-31-smoke-approval-artifact.md, docs/agent-approvals/2026-06-18T02-34-29-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-18T02-34-32-smoke-bundle-index.md
- Recent approval summaries: approval_fdd70eae-a14e-41a3-9865-a32d2be80b05 (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_d7c69dec-7878-494a-86ac-5d5c9ac469b3 (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_dd1dbf01-6da6-4e29-b785-3d9aa6505a31 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_d0534fdf-cd82-4ce0-997f-bfc297860216, traceartifact_fbf960d8-1ab1-4708-ad9c-566470ebeb29, traceartifact_6c28081b-2362-4da3-a1c7-a61407eef321
- Recent trace artifact paths: docs/agent-traces/2026-06-18T02-34-30-smoke-traces.md, docs/agent-traces/2026-06-18T02-34-29-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-18T02-34-26-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.