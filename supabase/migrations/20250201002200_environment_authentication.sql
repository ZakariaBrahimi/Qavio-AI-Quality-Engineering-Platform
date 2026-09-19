-- Environment authentication: lets an environment explicitly declare that
-- its target requires authentication before Playwright's functional QA can
-- do anything meaningful, and how to authenticate — without ever putting a
-- password, OTP, or session cookie in a row a browser session can read.
--
-- Background: Phase 7's PlaywrightTestExecutor had no way to represent
-- "this target redirects to a login page" — every run against an
-- auth-protected target silently checked the login page instead and
-- reported `completed`/`passed`, with a screenshot of an unrendered blank
-- page (see docs/authentication-qa.md for the full incident writeup).
--
-- Two additive pieces:
-- 1. `environments.auth_method` / `auth_credential_id` — which credential
--    (if any) a run should use, resolved fresh by the worker on every run,
--    the same way `base_url` already is (never carried in the BullMQ
--    payload).
-- 2. `create_credential_secret()` — the write-side counterpart to the
--    existing `get_credential_secret()` (20250201000400_credentials.sql).
--    Nothing could actually get a secret INTO Vault before this; every
--    call site is server-only (an admin-authorized Next.js Server Action),
--    same access model as the read side.

-- ── test_run_status: blocked ─────────────────────────────────────────────
-- A run that hit an authentication requirement it isn't configured to
-- satisfy is not a passing check, and it is not "the application is
-- broken" either — it's a distinct, actionable QA outcome. See
-- packages/types/src/test-run.ts for the updated transition map.
alter type test_run_status add value 'blocked';

-- ── credential_type: two new secret shapes ───────────────────────────────
-- Both still go through the exact same vault-backed credentials/
-- credential_secrets tables — this is a new *shape* of secret, not a new
-- storage mechanism.
-- `playwright_storage_state`: the secret value is a Playwright
--   `storageState` JSON blob (cookies + localStorage) captured from an
--   already-authenticated session. See browser-manager.ts.
-- `login_credentials`: reserved for a future email/password (+ OTP) login
--   flow. Modeled now so the type is stable; PlaywrightTestExecutor does
--   not implement it yet — selecting it produces a `blocked` run with an
--   explicit "not yet implemented" reason rather than a faked login.
alter type credential_type add value 'playwright_storage_state';
alter type credential_type add value 'login_credentials';

-- ── environments: explicit authentication configuration ──────────────────
create type environment_auth_method as enum ('none', 'stored_state', 'credentials');

alter table environments
  add column auth_method environment_auth_method not null default 'none',
  add column auth_credential_id uuid references credentials (id) on delete set null;

comment on column environments.auth_method is
  'How PlaywrightTestExecutor should authenticate before crawling this environment''s base_url. Never inferred from the URL — always explicitly set by a Qavio user (developer+ role, via the environment RLS policies already in place).';
comment on column environments.auth_credential_id is
  'The credential (in this same project) carrying the secret for auth_method. Must belong to the same project as the environment — enforced by validate_environment_auth_credential() below, not just the FK, since a project_id match is the actual security boundary a worker relies on.';

-- Defense in depth: the FK alone only proves the credential exists
-- *somewhere* in this database, not that it belongs to this environment's
-- own project. A worker's own query additionally scopes by project_id
-- (see workers/web/src/repository.ts), but this trigger makes the
-- invariant impossible to violate at the data layer too, regardless of
-- which code path writes the row.
create or replace function validate_environment_auth_credential()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  credential_project_id uuid;
begin
  if new.auth_credential_id is null then
    return new;
  end if;

  select project_id into credential_project_id
  from credentials
  where id = new.auth_credential_id;

  if credential_project_id is null then
    raise exception 'auth_credential_id % does not exist', new.auth_credential_id;
  end if;

  if credential_project_id <> new.project_id then
    raise exception 'auth_credential_id % belongs to a different project than this environment', new.auth_credential_id;
  end if;

  return new;
end;
$$;

-- Supabase's default privileges grant EXECUTE on new functions directly to
-- anon/authenticated (not just via PUBLIC), so revoking from PUBLIC alone
-- would leave both roles able to call this via PostgREST RPC — the exact
-- gap 20250201000800_lock_down_function_privileges.sql and
-- 20250201001400_lock_down_trigger_function.sql closed for earlier
-- trigger/RPC functions. Named explicitly here from the start.
revoke execute on function validate_environment_auth_credential() from public, anon, authenticated;

create trigger environments_validate_auth_credential
  before insert or update of auth_credential_id, project_id on environments
  for each row execute function validate_environment_auth_credential();

-- ── credential_secrets: the write side ────────────────────────────────────
-- Mirrors get_credential_secret()'s access model exactly: SECURITY DEFINER,
-- no in-body role check (there is no auth.uid() to check against — the
-- caller is always a service-role Server Action that already verified the
-- signed-in user has manage_environments/admin permission before ever
-- reaching this function), access controlled entirely by the REVOKE/GRANT
-- below. Upserts so re-saving a credential's secret (rotation) replaces the
-- old Vault entry's *mapping* rather than accumulating one row per save;
-- the orphaned old vault.decrypted_secrets row is not deleted here (Vault
-- itself provides secret deletion/rotation tooling if that's ever needed —
-- out of scope for this initial implementation, same "bounded, documented"
-- tradeoff as writeArtifacts' own retry comment in workers/web).
create or replace function create_credential_secret(p_credential_id uuid, p_secret text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  new_secret_id uuid;
begin
  new_secret_id := vault.create_secret(p_secret);

  insert into credential_secrets (credential_id, vault_secret_id)
  values (p_credential_id, new_secret_id)
  on conflict (credential_id) do update set vault_secret_id = excluded.vault_secret_id;
end;
$$;

-- `from public` alone is not enough — see the comment on
-- validate_environment_auth_credential's revoke above; anon/authenticated
-- get default EXECUTE directly, not just via PUBLIC.
revoke execute on function create_credential_secret(uuid, text) from public, anon, authenticated;
grant execute on function create_credential_secret(uuid, text) to service_role;
