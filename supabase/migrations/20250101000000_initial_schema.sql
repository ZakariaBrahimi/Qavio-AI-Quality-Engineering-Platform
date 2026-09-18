-- Qavio initial schema: organizations, projects, environments, test runs,
-- results, artifacts, bugs, and integrations. Every tenant-scoped table is
-- reachable from `organizations` (directly or via `projects`) so a single
-- Row Level Security pattern — "is the requesting user a member of the
-- owning organization?" — covers the whole schema.

create extension if not exists "pgcrypto";

-- ── organizations ──────────────────────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create type organization_member_role as enum ('owner', 'admin', 'member');

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role organization_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ── projects & environments ─────────────────────────────────────────────
create type project_platform as enum ('web', 'mobile', 'api');

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  platform project_platform not null default 'web',
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create type environment_kind as enum ('production', 'staging', 'preview', 'local');

create table environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  kind environment_kind not null default 'staging',
  base_url text not null,
  created_at timestamptz not null default now()
);

-- ── test runs, results, artifacts ───────────────────────────────────────
create type test_run_type as enum ('functional', 'visual', 'responsive', 'security');
create type test_run_status as enum ('queued', 'running', 'passed', 'failed', 'cancelled', 'error');

create table test_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  environment_id uuid not null references environments (id) on delete cascade,
  type test_run_type not null default 'functional',
  status test_run_status not null default 'queued',
  triggered_by uuid not null references auth.users (id),
  queue_job_id text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create type test_result_status as enum ('passed', 'failed', 'skipped', 'timed_out');

create table test_results (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references test_runs (id) on delete cascade,
  name text not null,
  status test_result_status not null,
  duration_ms integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create type test_artifact_kind as enum ('screenshot', 'video', 'trace', 'log');

create table test_artifacts (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references test_results (id) on delete cascade,
  kind test_artifact_kind not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ── bugs ─────────────────────────────────────────────────────────────────
create type bug_severity as enum ('low', 'medium', 'high', 'critical');
create type bug_status as enum ('open', 'investigating', 'fixed', 'wont_fix', 'closed');

create table bugs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  test_result_id uuid not null references test_results (id) on delete cascade,
  title text not null,
  severity bug_severity not null default 'medium',
  status bug_status not null default 'open',
  ai_summary text,
  external_issue_url text,
  created_at timestamptz not null default now()
);

-- ── integrations ─────────────────────────────────────────────────────────
create type integration_provider as enum ('jira', 'clickup', 'notion', 'linear', 'github', 'gitlab');

create table integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  provider integration_provider not null,
  is_connected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, provider)
);

-- ── indexes ──────────────────────────────────────────────────────────────
create index idx_organization_members_user_id on organization_members (user_id);
create index idx_projects_organization_id on projects (organization_id);
create index idx_environments_project_id on environments (project_id);
create index idx_test_runs_project_id on test_runs (project_id);
create index idx_test_results_test_run_id on test_results (test_run_id);
create index idx_test_artifacts_test_result_id on test_artifacts (test_result_id);
create index idx_bugs_project_id on bugs (project_id);
create index idx_integrations_organization_id on integrations (organization_id);

-- ── row level security ───────────────────────────────────────────────────
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table environments enable row level security;
alter table test_runs enable row level security;
alter table test_results enable row level security;
alter table test_artifacts enable row level security;
alter table bugs enable row level security;
alter table integrations enable row level security;

create or replace function is_organization_member(target_organization_id uuid)
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
      and user_id = auth.uid()
  );
$$;

create policy "members can read their organization" on organizations
  for select using (is_organization_member(id));

create policy "members can read their organization's membership" on organization_members
  for select using (is_organization_member(organization_id));

create policy "members can read their organization's projects" on projects
  for select using (is_organization_member(organization_id));

create policy "members can manage their organization's projects" on projects
  for insert with check (is_organization_member(organization_id));

create policy "members can read environments of their projects" on environments
  for select using (
    exists (
      select 1 from projects
      where projects.id = environments.project_id
        and is_organization_member(projects.organization_id)
    )
  );

create policy "members can read test runs of their projects" on test_runs
  for select using (
    exists (
      select 1 from projects
      where projects.id = test_runs.project_id
        and is_organization_member(projects.organization_id)
    )
  );

create policy "members can read test results of their test runs" on test_results
  for select using (
    exists (
      select 1 from test_runs
      join projects on projects.id = test_runs.project_id
      where test_runs.id = test_results.test_run_id
        and is_organization_member(projects.organization_id)
    )
  );

create policy "members can read test artifacts of their test results" on test_artifacts
  for select using (
    exists (
      select 1 from test_results
      join test_runs on test_runs.id = test_results.test_run_id
      join projects on projects.id = test_runs.project_id
      where test_results.id = test_artifacts.test_result_id
        and is_organization_member(projects.organization_id)
    )
  );

create policy "members can read bugs of their projects" on bugs
  for select using (
    exists (
      select 1 from projects
      where projects.id = bugs.project_id
        and is_organization_member(projects.organization_id)
    )
  );

create policy "members can read their organization's integrations" on integrations
  for select using (is_organization_member(organization_id));
