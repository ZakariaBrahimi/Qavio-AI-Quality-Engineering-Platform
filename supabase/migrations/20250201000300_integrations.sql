-- Qavio integrations: org-level bug-tracker/VCS connections, and the
-- OAuth account details behind each connection. Access tokens are never
-- stored in a plain column — see the Vault pattern below, reused again
-- in the credentials migration.

create type integration_provider as enum ('jira', 'clickup', 'notion', 'linear', 'github', 'gitlab');

create table integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  provider integration_provider not null,
  is_connected boolean not null default false,
  config jsonb not null default '{}',
  connected_by uuid references profiles (id),
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index idx_integrations_organization_id on integrations (organization_id);

create trigger integrations_set_updated_at
  before update on integrations
  for each row execute function set_updated_at();

-- Metadata about the connected external account. No token lives here.
create table integration_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  integration_id uuid not null references integrations (id) on delete cascade,
  external_account_id text not null,
  external_account_name text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_integration_accounts_organization_id on integration_accounts (organization_id);
create index idx_integration_accounts_integration_id on integration_accounts (integration_id);

create trigger integration_accounts_set_updated_at
  before update on integration_accounts
  for each row execute function set_updated_at();

-- ── secret storage (Supabase Vault) ──────────────────────────────────────
-- The OAuth access/refresh tokens live in Supabase Vault
-- (https://supabase.com/docs/guides/database/vault), encrypted at rest
-- with a key Postgres itself never exposes in plain SQL. This table only
-- stores *which* vault secret holds each token — never the token itself
-- — and has no RLS policies at all, so PostgREST (the `anon` and
-- `authenticated` roles) can never read or write it. Only `service_role`
-- (which bypasses RLS) or the SECURITY DEFINER function below can reach it.
create table integration_account_secrets (
  integration_account_id uuid primary key references integration_accounts (id) on delete cascade,
  access_token_secret_id uuid not null,
  refresh_token_secret_id uuid,
  created_at timestamptz not null default now()
);

alter table integration_account_secrets enable row level security;

-- Returns the decrypted access token for a connected account. Only
-- `service_role` may execute this — workers call it through the admin
-- Supabase client, never through the anon/authenticated client used by
-- the browser.
create or replace function get_integration_access_token(p_integration_account_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  token text;
begin
  -- Access control is enforced entirely by the REVOKE/GRANT below, not by
  -- an in-body role check: Postgres denies the call before this function
  -- body ever runs if the caller lacks EXECUTE. (A runtime check here
  -- would not work anyway — inside a SECURITY DEFINER function,
  -- current_user is always the function's owner, and session_user is
  -- whatever role the connection pooler originally authenticated as,
  -- neither of which reflects the caller's SET ROLE.)
  select decrypted_secret into token
  from vault.decrypted_secrets
  where id = (
    select access_token_secret_id
    from integration_account_secrets
    where integration_account_id = p_integration_account_id
  );

  return token;
end;
$$;

revoke all on function get_integration_access_token(uuid) from public;
grant execute on function get_integration_access_token(uuid) to service_role;

-- ── row level security ───────────────────────────────────────────────────
alter table integrations enable row level security;
alter table integration_accounts enable row level security;

create policy "members can read integrations" on integrations
  for select using (is_organization_member(organization_id));

create policy "admins can manage integrations" on integrations
  for insert with check (has_organization_role(organization_id, 'admin'));

create policy "admins can update integrations" on integrations
  for update using (has_organization_role(organization_id, 'admin'));

create policy "admins can remove integrations" on integrations
  for delete using (has_organization_role(organization_id, 'admin'));

create policy "members can read integration accounts" on integration_accounts
  for select using (is_organization_member(organization_id));

create policy "admins can manage integration accounts" on integration_accounts
  for insert with check (has_organization_role(organization_id, 'admin'));

create policy "admins can remove integration accounts" on integration_accounts
  for delete using (has_organization_role(organization_id, 'admin'));

-- integration_account_secrets intentionally has zero policies: RLS
-- defaults to deny-all, which is exactly the point (see comment above).
