-- Qavio credentials: secrets a test run needs to reach a target
-- environment (API keys, basic auth, OAuth tokens, SSH keys). Follows
-- the same split-table Vault pattern as integration_account_secrets:
-- metadata is readable by org members, the secret value is not
-- reachable through PostgREST at all.

create type credential_type as enum ('api_key', 'basic_auth', 'oauth_token', 'ssh_key', 'generic');

create table credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  environment_id uuid references environments (id) on delete cascade,
  name text not null,
  type credential_type not null default 'generic',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rotated_at timestamptz,
  unique (project_id, name)
);

create index idx_credentials_organization_id on credentials (organization_id);
create index idx_credentials_project_id on credentials (project_id);

create trigger credentials_set_updated_at
  before update on credentials
  for each row execute function set_updated_at();

-- No RLS policies on purpose (see integration_account_secrets for the
-- same reasoning) — this table is unreachable through the anon/
-- authenticated PostgREST roles.
create table credential_secrets (
  credential_id uuid primary key references credentials (id) on delete cascade,
  vault_secret_id uuid not null,
  created_at timestamptz not null default now()
);

alter table credential_secrets enable row level security;

-- The only way any code path — including workers — ever reads a
-- credential's secret value. `p_credential_id` must belong to the caller's
-- own organization check is deliberately NOT enforced here: this
-- function is service_role-only (workers), and workers act on behalf of
-- whichever test run queued them, not a signed-in browser session, so
-- there is no `auth.uid()` to check membership against. Authorization
-- for *which* credential a worker may fetch happens one layer up, when
-- the queue job is created for a specific test run/project.
create or replace function get_credential_secret(p_credential_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret text;
begin
  -- Access control is enforced entirely by the REVOKE/GRANT below — see
  -- the comment in get_integration_access_token() for why an in-body
  -- role check can't work inside a SECURITY DEFINER function.
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where id = (
    select vault_secret_id from credential_secrets where credential_id = p_credential_id
  );

  return secret;
end;
$$;

revoke all on function get_credential_secret(uuid) from public;
grant execute on function get_credential_secret(uuid) to service_role;

-- ── row level security ───────────────────────────────────────────────────
alter table credentials enable row level security;

create policy "admins can read credential metadata" on credentials
  for select using (has_organization_role(organization_id, 'admin'));

create policy "admins can create credentials" on credentials
  for insert with check (has_organization_role(organization_id, 'admin'));

create policy "admins can update credential metadata" on credentials
  for update using (has_organization_role(organization_id, 'admin'));

create policy "admins can delete credentials" on credentials
  for delete using (has_organization_role(organization_id, 'admin'));

-- credential_secrets has zero policies — deny-all by default.
