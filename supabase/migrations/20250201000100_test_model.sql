-- Qavio test model: suites, cases, runs, queue jobs, results, and artifacts.
--
-- test_run_status mirrors the BullMQ job lifecycle plus an "analyzing"
-- step for the (future) AI analysis pass, so the control plane never has
-- to infer run state from job state — the worker updates test_runs
-- directly. TIMED_OUT / PAUSED / WAITING_FOR_APPROVAL from the product
-- spec are intentionally not included yet: nothing produces them until
-- the execution engine (a later phase) exists, and adding enum values
-- later is a cheap, additive migration.
create type test_run_status as enum (
  'created', 'queued', 'starting', 'running', 'analyzing',
  'completed', 'failed', 'cancelled'
);

create type test_run_type as enum ('functional', 'visual', 'responsive', 'security');

create type test_run_job_status as enum ('queued', 'active', 'completed', 'failed', 'delayed');

create type test_result_status as enum ('passed', 'failed', 'skipped', 'blocked');

create type artifact_kind as enum (
  'screenshot', 'video', 'trace', 'log', 'dom_snapshot', 'json_report'
);

-- ── test_suites / test_cases ─────────────────────────────────────────────
create table test_suites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_test_suites_organization_id on test_suites (organization_id);
create index idx_test_suites_project_id on test_suites (project_id);

create trigger test_suites_set_updated_at
  before update on test_suites
  for each row execute function set_updated_at();

-- `steps` is genuinely dynamic (an ordered list of free-form action/assert
-- steps whose shape isn't fixed), so it's the one JSONB column here —
-- everything else in this table is a plain scalar.
create table test_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  test_suite_id uuid not null references test_suites (id) on delete cascade,
  title text not null,
  description text,
  steps jsonb not null default '[]',
  expected_result text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_test_cases_organization_id on test_cases (organization_id);
create index idx_test_cases_test_suite_id on test_cases (test_suite_id);

create trigger test_cases_set_updated_at
  before update on test_cases
  for each row execute function set_updated_at();

-- ── test_runs / test_run_jobs ────────────────────────────────────────────
create table test_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  environment_id uuid not null references environments (id) on delete cascade,
  test_suite_id uuid references test_suites (id) on delete set null,
  type test_run_type not null default 'functional',
  status test_run_status not null default 'created',
  triggered_by uuid references profiles (id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_test_runs_organization_id on test_runs (organization_id);
create index idx_test_runs_project_id on test_runs (project_id);
create index idx_test_runs_status on test_runs (status);

-- One row per worker attempt at a run (retries, or one per browser when a
-- run fans out) — this is what actually tracks BullMQ job identity;
-- test_runs.status is the run's own state, derived from its jobs by the
-- worker, not stored redundantly per job.
create table test_run_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  test_run_id uuid not null references test_runs (id) on delete cascade,
  queue_name text not null,
  job_id text not null,
  status test_run_job_status not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_test_run_jobs_organization_id on test_run_jobs (organization_id);
create index idx_test_run_jobs_test_run_id on test_run_jobs (test_run_id);

-- ── test_results ─────────────────────────────────────────────────────────
create table test_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  test_run_id uuid not null references test_runs (id) on delete cascade,
  test_case_id uuid references test_cases (id) on delete set null,
  name text not null,
  status test_result_status not null,
  duration_ms integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_test_results_organization_id on test_results (organization_id);
create index idx_test_results_test_run_id on test_results (test_run_id);
create index idx_test_results_status on test_results (status);

-- ── artifacts ────────────────────────────────────────────────────────────
-- Metadata/reference only — the bytes live in Supabase Storage (see the
-- storage migration) under
-- organizations/{organization_id}/projects/{project_id}/test-runs/{test_run_id}/...
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  test_result_id uuid not null references test_results (id) on delete cascade,
  kind artifact_kind not null,
  storage_bucket text not null default 'artifacts',
  storage_path text not null check (storage_path like 'organizations/%'),
  content_type text,
  size_bytes bigint,
  checksum text,
  created_at timestamptz not null default now()
);

create index idx_artifacts_organization_id on artifacts (organization_id);
create index idx_artifacts_test_result_id on artifacts (test_result_id);

-- ── row level security ───────────────────────────────────────────────────
alter table test_suites enable row level security;
alter table test_cases enable row level security;
alter table test_runs enable row level security;
alter table test_run_jobs enable row level security;
alter table test_results enable row level security;
alter table artifacts enable row level security;

create policy "members can read test suites" on test_suites
  for select using (is_organization_member(organization_id));
create policy "qa can manage test suites" on test_suites
  for insert with check (has_organization_role(organization_id, 'qa'));
create policy "qa can update test suites" on test_suites
  for update using (has_organization_role(organization_id, 'qa'));
create policy "admins can delete test suites" on test_suites
  for delete using (has_organization_role(organization_id, 'admin'));

create policy "members can read test cases" on test_cases
  for select using (is_organization_member(organization_id));
create policy "qa can manage test cases" on test_cases
  for insert with check (has_organization_role(organization_id, 'qa'));
create policy "qa can update test cases" on test_cases
  for update using (has_organization_role(organization_id, 'qa'));
create policy "admins can delete test cases" on test_cases
  for delete using (has_organization_role(organization_id, 'admin'));

create policy "members can read test runs" on test_runs
  for select using (is_organization_member(organization_id));
create policy "developers can start test runs" on test_runs
  for insert with check (has_organization_role(organization_id, 'developer'));
-- Workers update run status via the service role (bypasses RLS); members
-- may still cancel their own organization's runs from the UI.
create policy "members can update their organization's test runs" on test_runs
  for update using (is_organization_member(organization_id));

create policy "members can read test run jobs" on test_run_jobs
  for select using (is_organization_member(organization_id));

create policy "members can read test results" on test_results
  for select using (is_organization_member(organization_id));

create policy "members can read artifacts" on artifacts
  for select using (is_organization_member(organization_id));
