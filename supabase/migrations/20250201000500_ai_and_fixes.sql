-- Qavio AI layer: analysis records, the fix suggestions they produce, and
-- attempts to apply those fixes. Written by workers/ai (service role);
-- the control plane only ever reads these.

create table ai_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  test_result_id uuid references test_results (id) on delete cascade,
  issue_id uuid references issues (id) on delete cascade,
  provider text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  summary text not null,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  constraint ai_analyses_subject_check check (test_result_id is not null or issue_id is not null)
);

create index idx_ai_analyses_organization_id on ai_analyses (organization_id);
create index idx_ai_analyses_test_result_id on ai_analyses (test_result_id);
create index idx_ai_analyses_issue_id on ai_analyses (issue_id);

create type fix_suggestion_status as enum ('proposed', 'approved', 'rejected', 'applied');

create table fix_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  issue_id uuid not null references issues (id) on delete cascade,
  ai_analysis_id uuid references ai_analyses (id) on delete set null,
  description text not null,
  diff text,
  status fix_suggestion_status not null default 'proposed',
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fix_suggestions_organization_id on fix_suggestions (organization_id);
create index idx_fix_suggestions_issue_id on fix_suggestions (issue_id);

create trigger fix_suggestions_set_updated_at
  before update on fix_suggestions
  for each row execute function set_updated_at();

create type fix_attempt_status as enum ('pending', 'running', 'succeeded', 'failed');

create table fix_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  fix_suggestion_id uuid not null references fix_suggestions (id) on delete cascade,
  status fix_attempt_status not null default 'pending',
  pull_request_url text,
  log text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_fix_attempts_organization_id on fix_attempts (organization_id);
create index idx_fix_attempts_fix_suggestion_id on fix_attempts (fix_suggestion_id);

-- ── row level security ───────────────────────────────────────────────────
alter table ai_analyses enable row level security;
alter table fix_suggestions enable row level security;
alter table fix_attempts enable row level security;

create policy "members can read ai analyses" on ai_analyses
  for select using (is_organization_member(organization_id));

create policy "members can read fix suggestions" on fix_suggestions
  for select using (is_organization_member(organization_id));

-- Approving/rejecting a suggested fix is a human decision made through
-- the app, not a worker action — QA+ may update status (e.g. to
-- 'approved'/'rejected'); only a worker (service role) marks one 'applied'
-- once it has actually run.
create policy "qa can review fix suggestions" on fix_suggestions
  for update using (has_organization_role(organization_id, 'qa'));

create policy "members can read fix attempts" on fix_attempts
  for select using (is_organization_member(organization_id));
