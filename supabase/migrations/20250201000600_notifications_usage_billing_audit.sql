-- Qavio notifications, usage tracking, billing, and audit logging.

-- ── notifications ────────────────────────────────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_organization_id on notifications (organization_id);
create index idx_notifications_user_id on notifications (user_id);
create index idx_notifications_unread on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

create policy "users can read their own notifications" on notifications
  for select using (user_id = auth.uid());

-- Only marking as read is a user action; notifications are otherwise
-- created by the server/workers via the service role.
create policy "users can mark their own notifications read" on notifications
  for update using (user_id = auth.uid());

-- ── usage_events ─────────────────────────────────────────────────────────
-- Append-only ledger of billable/operational usage. Written exclusively
-- by workers/the server via the service role — there is no insert
-- policy for authenticated users, and rows are never updated in place.
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  test_run_id uuid references test_runs (id) on delete set null,
  event_type text not null check (
    event_type in ('test_run', 'browser_minutes', 'ai_request', 'ai_tokens', 'artifact_storage')
  ),
  provider text,
  model text,
  quantity numeric not null,
  unit text not null,
  estimated_cost_cents integer,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_usage_events_organization_id on usage_events (organization_id);
create index idx_usage_events_created_at on usage_events (created_at);

alter table usage_events enable row level security;

-- Usage data is billing-adjacent, so it's restricted to admins+, unlike
-- most other org-scoped read policies in this schema.
create policy "admins can read usage events" on usage_events
  for select using (has_organization_role(organization_id, 'admin'));

-- ── subscriptions ────────────────────────────────────────────────────────
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations (id) on delete cascade,
  plan text not null default 'free',
  status subscription_status not null default 'trialing',
  seats integer not null default 1,
  provider text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

create policy "admins can read their subscription" on subscriptions
  for select using (has_organization_role(organization_id, 'admin'));

-- Billing state changes only through a billing-provider webhook running
-- as the service role — no authenticated insert/update policy.

-- ── audit_logs ───────────────────────────────────────────────────────────
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  -- Null actor_id means the system (a worker, a webhook) performed the action.
  actor_id uuid references profiles (id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  ip_address inet,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_organization_id on audit_logs (organization_id);
create index idx_audit_logs_created_at on audit_logs (created_at);

alter table audit_logs enable row level security;

create policy "admins can read audit logs" on audit_logs
  for select using (has_organization_role(organization_id, 'admin'));

-- The one and only way audit rows get written from a user-facing
-- context: every "who did what" event in this system — including ones
-- with no natural table trigger, like a login or an invitation email
-- being sent — should call this function rather than insert into
-- audit_logs directly, so the row shape and actor attribution rule are
-- defined exactly once. Workers/webhooks (service role) may also insert
-- directly since they bypass RLS, e.g. for billing events.
create or replace function log_audit_event(
  p_organization_id uuid,
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'
)
returns audit_logs
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_row audit_logs;
begin
  insert into audit_logs (organization_id, actor_id, action, target_type, target_id, metadata)
  values (p_organization_id, auth.uid(), p_action, p_target_type, p_target_id, p_metadata)
  returning * into new_row;

  return new_row;
end;
$$;

revoke all on function log_audit_event(uuid, text, text, uuid, jsonb) from public;
grant execute on function log_audit_event(uuid, text, text, uuid, jsonb) to authenticated, service_role;

create policy "members can log their own actions" on audit_logs
  for insert with check (is_organization_member(organization_id) and actor_id = auth.uid());

-- ── security-critical triggers ───────────────────────────────────────────
-- Everything else in the "Support auditing of..." list (logins,
-- invitations, test run creation/cancellation, issue changes, AI fix
-- approvals) is logged by the application/worker code that already
-- handles those flows, calling log_audit_event() directly — see
-- docs/database.md. Role and credential changes get a DB trigger instead
-- because they're security-sensitive enough to log even if a future code
-- path forgets to call log_audit_event() itself.

create or replace function audit_organization_member_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    perform log_audit_event(
      new.organization_id,
      'member_role_changed',
      'organization_member',
      new.id,
      jsonb_build_object('user_id', new.user_id, 'old_role', old.role, 'new_role', new.role)
    );
  end if;
  return new;
end;
$$;

create trigger organization_members_audit_role_change
  after update on organization_members
  for each row execute function audit_organization_member_role_change();

create or replace function audit_credential_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform log_audit_event(new.organization_id, 'credential_created', 'credential', new.id,
      jsonb_build_object('name', new.name));
  elsif tg_op = 'UPDATE' then
    perform log_audit_event(new.organization_id, 'credential_updated', 'credential', new.id,
      jsonb_build_object('name', new.name));
  elsif tg_op = 'DELETE' then
    perform log_audit_event(old.organization_id, 'credential_deleted', 'credential', old.id,
      jsonb_build_object('name', old.name));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger credentials_audit_change
  after insert or update or delete on credentials
  for each row execute function audit_credential_change();

create or replace function audit_test_run_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    perform log_audit_event(new.organization_id, 'test_run_cancelled', 'test_run', new.id, '{}');
  end if;
  return new;
end;
$$;

create trigger test_runs_audit_cancelled
  after update on test_runs
  for each row execute function audit_test_run_cancelled();

create or replace function audit_issue_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform log_audit_event(
      new.organization_id, 'issue_status_changed', 'issue', new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger issues_audit_status_change
  after update on issues
  for each row execute function audit_issue_status_change();

create or replace function audit_fix_suggestion_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform log_audit_event(
      new.organization_id, 'fix_suggestion_approved', 'fix_suggestion', new.id, '{}'
    );
  end if;
  return new;
end;
$$;

create trigger fix_suggestions_audit_approved
  after update on fix_suggestions
  for each row execute function audit_fix_suggestion_approved();
