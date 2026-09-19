-- Qavio Phase 6: schema support for the real Test Run job pipeline
-- (Qavio Web -> Supabase -> BullMQ -> Redis -> Web Worker).
--
-- Three things, all additive:
-- 1. `test_runs.configuration` / `test_runs.error_message` — a place to
--    persist run-level configuration (the queue payload deliberately
--    stays minimal identifiers only, per docs/test-run-engine.md; the
--    worker loads the full row instead of trusting a duplicated,
--    possibly-stale copy in Redis) and a run-level failure reason (not
--    a per-test-result error — the run itself can fail before any
--    result exists, e.g. an unreachable environment).
-- 2. A real authorization bug fix: `has_organization_role()` is a rank
--    threshold, and QA/DEVELOPER are peer ranks (see
--    organization_role_rank() in the core schema) — so the original
--    "developers can start test runs" policy actually let a developer
--    start one too, even though apps/web's rbac.ts has always
--    documented (and gated the UI on) QA+ only:
--    "only QA (and admin/owner above it) runs and manages test
--    workflows... Developer can view results and work issues, but not
--    launch a run". `can_manage_test_workflows()` mirrors that exact
--    TEST_WORKFLOW_ROLES set so the two can never drift apart the way
--    a rank number could.
-- 3. `test_run_jobs` gets an INSERT policy (previously read-only from
--    the client side — nothing ever wrote to it) so the same actor who
--    creates a test run can also record the BullMQ job id for it,
--    without needing the service role for that one insert.

alter table test_runs add column configuration jsonb not null default '{}';
alter table test_runs add column error_message text;

alter table test_runs add constraint test_runs_configuration_is_object
  check (jsonb_typeof(configuration) = 'object');

create or replace function can_manage_test_workflows(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin', 'qa')
  );
$$;

drop policy "developers can start test runs" on test_runs;
create policy "qa can start test runs" on test_runs
  for insert with check (can_manage_test_workflows(organization_id));

create policy "qa can record test run jobs" on test_run_jobs
  for insert with check (can_manage_test_workflows(organization_id));

-- ── realtime ─────────────────────────────────────────────────────────────
-- So the Test Run details page can reflect QUEUED -> STARTING -> RUNNING
-- -> COMPLETED/FAILED without a manual refresh. Realtime still goes
-- through RLS ("members can read test runs") — a subscriber only ever
-- receives change events for rows they could already SELECT.
--
-- Guarded: `supabase_realtime` is a real Supabase project's own
-- built-in publication, provisioned by the platform itself, not
-- something a plain local/stub Postgres (see docs/database.md's "Local
-- verification") has — this migration stays runnable there too instead
-- of failing on a publication that will never exist outside a real
-- Supabase project.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table test_runs;
  end if;
end
$$;
