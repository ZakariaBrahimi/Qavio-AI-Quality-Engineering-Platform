-- Qavio Phase 6: tighten `test_runs` UPDATE to QA+.
--
-- "members can update their organization's test runs" let ANY member
-- (including Viewer) flip a run's status via a direct API call — never
-- the intent (see apps/web/src/lib/rbac.ts's `manage_test_workflows`
-- permission, and the same gap already fixed for INSERT in
-- 20250201001800_test_run_queue_infra.sql). The control plane's
-- `createTestRun`/`cancelTestRun` Server Actions already enforce this at
-- the app level; this closes the same hole at the actual authorization
-- boundary. Workers write through the service role, which bypasses RLS
-- entirely, so this has no effect on worker updates.
drop policy "members can update their organization's test runs" on test_runs;
create policy "qa can update their organization's test runs" on test_runs
  for update using (can_manage_test_workflows(organization_id));
