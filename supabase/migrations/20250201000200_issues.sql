-- Qavio issues: bugs detected from test results (by a worker or by AI
-- analysis), plus threaded comments.

create type issue_severity as enum ('critical', 'high', 'medium', 'low');

create type issue_status as enum (
  'open', 'in_progress', 'resolved', 'reopened', 'ignored', 'duplicate'
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  test_run_id uuid references test_runs (id) on delete set null,
  test_result_id uuid references test_results (id) on delete set null,
  title text not null,
  description text,
  severity issue_severity not null default 'medium',
  status issue_status not null default 'open',
  -- Genuinely dynamic: an ordered list of evidence references
  -- ({type, artifact_id} or {type, url}) whose shape varies by evidence type.
  evidence jsonb not null default '[]',
  ai_summary text,
  external_issue_url text,
  assigned_to uuid references profiles (id),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_issues_organization_id on issues (organization_id);
create index idx_issues_project_id on issues (project_id);
create index idx_issues_status on issues (status);
create index idx_issues_severity on issues (severity);

create trigger issues_set_updated_at
  before update on issues
  for each row execute function set_updated_at();

create table issue_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  issue_id uuid not null references issues (id) on delete cascade,
  -- Nullable: a comment left by AI analysis (rather than a person) has no author.
  author_id uuid references profiles (id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_issue_comments_organization_id on issue_comments (organization_id);
create index idx_issue_comments_issue_id on issue_comments (issue_id);

create trigger issue_comments_set_updated_at
  before update on issue_comments
  for each row execute function set_updated_at();

-- ── row level security ───────────────────────────────────────────────────
alter table issues enable row level security;
alter table issue_comments enable row level security;

create policy "members can read issues" on issues
  for select using (is_organization_member(organization_id));

create policy "qa can create issues" on issues
  for insert with check (has_organization_role(organization_id, 'qa'));

create policy "qa can update issues" on issues
  for update using (has_organization_role(organization_id, 'qa'));

create policy "admins can delete issues" on issues
  for delete using (has_organization_role(organization_id, 'admin'));

create policy "members can read issue comments" on issue_comments
  for select using (is_organization_member(organization_id));

create policy "members can add issue comments" on issue_comments
  for insert with check (
    is_organization_member(organization_id) and author_id = auth.uid()
  );

create policy "authors can update their own comments" on issue_comments
  for update using (author_id = auth.uid());

create policy "authors can delete their own comments" on issue_comments
  for delete using (author_id = auth.uid());
