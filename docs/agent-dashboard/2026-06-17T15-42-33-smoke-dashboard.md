# smoke dashboard

- Generated at: 2026-06-17T15:42:33.547Z
- Active goal: smoke test goal

## Summary
- Plan progress: 0/1
- Linked subagents: 1
- Pending subagent reviews: 1
- Reviews: 13
- Open approvals: 2
- Governance summary: openApprovals=2 hold=yes approvalPending=yes goalBlocked=no latestWorkflowStatus=pending_approval reasonCodes=governance_hold,approval_pending,review_plan_needs_attention,review_repo_needs_attention,review_code_needs_attention blocker=(none)
- Workflows: 2
- Workflow artifacts: 1
- Traces: 57
- Trace artifacts: 3
- Latest workflow: workflow_c6ca16d2-dddf-405d-9959-7ef21bedf2c5 (pending_approval)
- Latest workflow reason codes: governance_hold, approval_pending, review_plan_needs_attention, review_repo_needs_attention, review_code_needs_attention
- Missing artifacts: dashboardArtifact

## Recent Records
- Plan artifacts: docs/agent-plans/2026-06-17T15-42-24-governance-hold-workflow.md, docs/agent-plans/2026-06-17T15-42-19-smoke-workflow.md, docs/agent-plans/2026-06-17T15-31-26-smoke-test-plan.md
- Review artifacts: docs/agent-reviews/2026-06-17T15-42-25-code-review.md, docs/agent-reviews/2026-06-17T15-42-25-repo-review.md, docs/agent-reviews/2026-06-17T15-42-25-plan-review.md
- Approval requests: approval_caccaf9f-830d-4b86-b18f-e654bd89f27a (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_4d7fffcf-6d5a-4810-864c-49ef7fe459fa (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_28d458ad-4b61-4c4d-9126-10aeec44a9b3 (approved) run shell command "echo hello"
- Approval artifacts: docs/agent-approvals/2026-06-17T15-42-30-smoke-approval-artifact.md, docs/agent-approvals/2026-06-17T15-42-25-governance-approval-artifact.md
- Dashboard artifacts: (none)
- Bundle-index artifacts: docs/agent-bundles/2026-06-17T15-42-33-smoke-bundle-index.md
- Workflow artifacts: docs/agent-workflows/2026-06-17T15-42-27-governance-hold-workflow.md
- Trace kinds: approval_requested, approval_requested, approval_override_used, approval_retry_executed, approval_override_used
- Suggested first tools: list_approval_requests, read_approval_request, read_approval_artifact, get_dashboard_summary, get_plan_summary
- Suggested next reads: approvalArtifact:approvalartifact_9a981312-0334-452e-ae1d-195a37b203d5, approvalRequest:approval_caccaf9f-830d-4b86-b18f-e654bd89f27a, workflowArtifact:workflowartifact_d5b898b7-10b4-4c7d-b0ce-cc8ee6ba1dd3, bundleIndexArtifact:bundleartifact_588487a3-c5cf-44b1-9478-3c1706c2d304, approvalArtifact:approvalartifact_9a981312-0334-452e-ae1d-195a37b203d5, workflowRun:workflow_c6ca16d2-dddf-405d-9959-7ef21bedf2c5, planArtifact:planartifact_3979c656-eb82-4899-a5b4-f04c86092201, reviewArtifact:reviewartifact_373313f0-7ced-4ba6-bc80-25fbcfc9df50, traceArtifact:traceartifact_915a2b6f-3cb7-4759-ab46-ec2cc49a81a9

## Linked Summaries
- Latest workflow bundle: workflow_c6ca16d2-dddf-405d-9959-7ef21bedf2c5 (pending_approval)
- Recent dashboard artifact ids: (none)
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact ids: bundleartifact_588487a3-c5cf-44b1-9478-3c1706c2d304
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-17T15-42-33-smoke-bundle-index.md
- Recent plan artifact ids: planartifact_3979c656-eb82-4899-a5b4-f04c86092201, planartifact_077004cc-6303-42f4-bb8a-80c9fe40fdab, planartifact_970bd541-8d70-4152-92a0-ce5ea3d732fe
- Recent review artifact ids: reviewartifact_373313f0-7ced-4ba6-bc80-25fbcfc9df50, reviewartifact_d529e8b6-3c07-482f-b45b-36d9ef0e8633, reviewartifact_7fea84b2-c8d4-4771-83f9-13306d6a18bb
- Recent workflow artifact ids: workflowartifact_d5b898b7-10b4-4c7d-b0ce-cc8ee6ba1dd3
- Recent workflow artifact paths: docs/agent-workflows/2026-06-17T15-42-27-governance-hold-workflow.md
- Recent approval artifact ids: approvalartifact_9a981312-0334-452e-ae1d-195a37b203d5, approvalartifact_26cbf1c1-d685-4ddc-b012-42a298a523e6
- Recent approval artifact paths: docs/agent-approvals/2026-06-17T15-42-30-smoke-approval-artifact.md, docs/agent-approvals/2026-06-17T15-42-25-governance-approval-artifact.md
- Recent dashboard artifact paths: (none)
- Recent bundle-index artifact paths: docs/agent-bundles/2026-06-17T15-42-33-smoke-bundle-index.md
- Recent approval summaries: approval_caccaf9f-830d-4b86-b18f-e654bd89f27a (pending) patch README.md: "Coding Agent" -> "Coding Agent Updated", approval_4d7fffcf-6d5a-4810-864c-49ef7fe459fa (pending) write tmp/policy-write.txt with 2 line(s) and 10 character(s), approval_28d458ad-4b61-4c4d-9126-10aeec44a9b3 (approved) run shell command "echo hello"
- Recent trace artifact ids: traceartifact_915a2b6f-3cb7-4759-ab46-ec2cc49a81a9, traceartifact_562dcf89-bcea-4c67-b480-66ab1c755c09, traceartifact_dc0cd2df-7ade-4f87-9371-9335c774bd91
- Recent trace artifact paths: docs/agent-traces/2026-06-17T15-42-28-smoke-traces.md, docs/agent-traces/2026-06-17T15-42-25-governance-hold-workflow-traces.md, docs/agent-traces/2026-06-17T15-42-19-smoke-workflow-traces.md

## Notes
- This file was generated by the coding-agent dashboard artifact exporter.
- Export a fresh dashboard artifact when you need a point-in-time project state snapshot.