# Database

Qavio's control-plane database is PostgreSQL, managed through Supabase
(Auth, Storage, Realtime where useful, Row Level Security). Heavy or
long-running work never runs inside a Supabase Edge Function — it runs in
`workers/*`, which talk to Postgres and Storage using the service role.

This document describes the schema in `supabase/migrations`. It does not
cover the (not-yet-implemented) Test Run execution engine — see
`docs/architecture.md` for where that fits.

## Multi-tenant model

```
auth.users → profiles
profiles → organization_members → organizations
organizations → projects → environments
projects → test_suites → test_cases
projects/environments → test_runs → test_run_jobs
test_runs → test_results → artifacts
projects/test_runs/test_results → issues → issue_comments
```

A user can belong to multiple organizations (multiple `organization_members`
rows). Every organization-owned table carries its own `organization_id` —
even tables reachable via a join, like `test_cases` (via `test_suites` via
`projects`). This is a deliberate denormalization: it keeps every RLS
policy a single indexed check instead of a multi-table join, and it keeps
authorization logic in one place (see below) instead of re-derived per
table.

## Migrations

| File | Contents |
|---|---|
| `20250201000000_core_schema.sql` | extensions, `organization_role`, `profiles` (+ auto-create trigger on `auth.users`), `organizations`, `organization_members`, `projects`, `environments`, the two authorization helper functions, `create_organization()` |
| `20250201000100_test_model.sql` | `test_suites`, `test_cases`, `test_runs`, `test_run_jobs`, `test_results`, `artifacts` |
| `20250201000200_issues.sql` | `issues`, `issue_comments` |
| `20250201000300_integrations.sql` | `integrations`, `integration_accounts`, `integration_account_secrets`, `get_integration_access_token()` |
| `20250201000400_credentials.sql` | `credentials`, `credential_secrets`, `get_credential_secret()` |
| `20250201000500_ai_and_fixes.sql` | `ai_analyses`, `fix_suggestions`, `fix_attempts` |
| `20250201000600_notifications_usage_billing_audit.sql` | `notifications`, `usage_events`, `subscriptions`, `audit_logs`, `log_audit_event()`, security-critical triggers |
| `20250201000700_storage.sql` | the `artifacts` Storage bucket and its RLS policy |
| `20250201000800_lock_down_function_privileges.sql` | closes a real-project-only privilege gap: Supabase grants `EXECUTE` to `anon`/`authenticated` on every new function independent of `PUBLIC`, so `get_credential_secret()`/`get_integration_access_token()` were reachable by both despite the `REVOKE ALL FROM PUBLIC` in their own migrations; also pins `search_path` on two functions that didn't set one |
| `20250201000900_revoke_public_execute_on_triggers.sql` | follow-up: the trigger-only audit functions and `handle_new_user()`/`set_updated_at()` still had the default `PUBLIC` grant itself (not just the per-role one), so revoking from `anon`/`authenticated` alone hadn't closed them |
| `20250201001000_rls_performance.sql` | wraps `auth.uid()` in RLS policies as `(select auth.uid())` and merges the two `profiles` SELECT policies into one, per the performance advisor |
| `20250201001100_missing_fk_indexes.sql` | covering indexes for the secondary (non-`organization_id`) foreign keys the performance advisor flagged |
| `20250201001200_invitations.sql` | `invitations`, `get_invitation_preview()` (token-scoped, callable signed-out), `accept_invitation()` |
| `20250201001300_membership_role_guardrails.sql` | tightens `organization_members` insert/update/delete so only an owner can grant/touch the owner role, plus a trigger blocking removal of an organization's last owner |
| `20250201001400_lock_down_trigger_function.sql` | same PUBLIC-grant gap as `20250201000900`, found on the new `prevent_last_owner_removal()` trigger function by the security advisor |
| `20250201001500_invitations_performance.sql` | FK index + `(select auth.uid())` wrap on `invitations`, per the performance advisor |
| `20250201001600_fix_accept_invitation_expiry_update.sql` | removes a no-op `update ... set status = 'expired'` inside `accept_invitation()` — it always rolled back with the `RAISE EXCEPTION` right after it, found by manually exercising the function; the expiry check itself was never affected, only the (never-persisted) bookkeeping |
| `20250201001700_project_environment_config.sql` | Phase 4: `projects.description`, `projects.archived_at` (soft delete), `environments.configuration` (jsonb, object-shape checked), `environments.archived_at`, `environments.is_default` + a partial unique index enforcing at most one default per project, and `set_default_environment(environment_id)` — a `SECURITY INVOKER` function so atomically clearing the old default and setting the new one can't race, without granting any privilege RLS wouldn't already give the caller |

Deliberately not implemented yet (per the current product phase): devices,
device_runs, visual_baselines, visual_comparisons, security_scans,
security_findings, pull_requests, code_changes, quality_metrics. Adding
them later is additive — nothing in this schema needs to change shape to
accommodate them.

## Roles

```
OWNER > ADMIN > { QA, DEVELOPER } > VIEWER
```

QA and DEVELOPER are peers — neither implies the other. Stored as the
`organization_role` enum (`owner`, `admin`, `qa`, `developer`, `viewer`).

Authorization is centralized in exactly two SQL functions, used by every
policy in every migration — no table re-implements a membership or role
check:

- `is_organization_member(organization_id)` — is the caller a member at all.
- `has_organization_role(organization_id, min_role)` — is the caller a
  member whose role's rank is `>=` the rank of `min_role`
  (`organization_role_rank()` defines the ranking once).

An organization is always created through `create_organization(name, slug)`,
which inserts the organization and its first `organization_members` row
(as `owner`) in one atomic, `SECURITY DEFINER` call — an organization can
never exist without an owner, which would otherwise make it invisible to
everyone under RLS.

Symmetrically, an organization can never lose its *last* owner:
`prevent_last_owner_removal()` (a trigger, not a policy — it needs to see
whether an owner row being touched is the only one left, which an RLS
`USING` clause can't express) blocks an `UPDATE` that changes an owner's
role away from `owner`, or a `DELETE` of an owner row, whenever no other
owner would remain. And only an owner may grant the `owner` role in the
first place, or touch an existing owner's row at all — an admin's
`has_organization_role(organization_id, 'admin')` alone is *not* enough
for the `owner` transition on `organization_members` insert/update/delete
(see `20250201001300_membership_role_guardrails.sql`). Before that
migration, any admin could have promoted themselves to owner, or demoted
the real one.

## Invitations

Adding someone to an organization always goes through `invitations`, never
a direct `organization_members` insert — even for the app's own code path.
`role`-gated the same way as everything else (`admin`+ to create/revoke,
owner-only to invite as `owner`), with one partial unique index enforcing
a single *pending* invite per `(organization_id, email)` at a time.

Accepting one is the interesting part, because the invitee isn't an
organization member yet — they can't satisfy any of the normal RLS
policies:

- `get_invitation_preview(token)` — `SECURITY DEFINER`, granted to `anon`
  as well as `authenticated`, so an invite link works before the invitee
  has even signed in. It only ever returns the one row matching an exact
  token, never a list — the token itself is the capability, the same way
  a password-reset link is.
- `accept_invitation(token)` — `SECURITY DEFINER`, `authenticated` only.
  Re-validates everything itself regardless of what the caller claims:
  the token resolves to a `pending`, non-expired invitation, and the
  caller's own `auth.users.email` matches the invited address
  (case-insensitively). Only then does it insert the
  `organization_members` row and mark the invitation `accepted`.

`apps/web` never trusts a client-supplied email/role pair for this —
the accept flow only ever takes a token, and everything it grants access
to comes from the invitation row that token resolves to.

## Row Level Security

RLS is enabled on every table. The default is deny-all; each table then
gets explicit policies. As a rule of thumb across the schema:

- **Read**: any organization member (`is_organization_member`), except
  `credentials` (metadata only, admin+), `usage_events`, `subscriptions`,
  and `audit_logs` (admin+ — billing- and security-adjacent).
- **Write**: role-gated per resource (e.g. `developer`+ to start a test
  run, `qa`+ to manage test suites/cases/issues, `admin`+ to manage
  projects/environments/integrations/credentials, `owner` to delete a
  project).
- **Worker-written tables** (`test_run_jobs`, `test_results`, `artifacts`,
  `ai_analyses`, `fix_attempts`, `usage_events`) have no
  authenticated-role insert/update policy at all — only the service role
  (which bypasses RLS) writes them; members only ever read.

See `docs/architecture.md`'s "Not in Phase 1" list for what's out of
scope; this document only covers what's actually implemented.

### Verified isolation

The following were exercised against a local Postgres instance with the
real migrations applied (see "Local verification" below) and all pass:

- A non-member cannot `SELECT` another organization's project, test run,
  test result, artifact, or issue (all return zero rows).
- A non-member cannot `UPDATE` another organization's project (zero rows
  affected).
- A non-member cannot `INSERT` an issue into a project they don't belong
  to (RLS violation).
- A `viewer` can read a project but cannot start a test run (role-gated
  `INSERT` fails; `developer`+ succeeds).
- `credential_secrets` and `integration_account_secrets` are unreachable
  by `anon`/`authenticated` — no policy exists for either role. Only
  `service_role` may call `get_credential_secret()` /
  `get_integration_access_token()` (enforced by `REVOKE`/`GRANT EXECUTE`,
  not a runtime check — see the note in `20250201000400_credentials.sql`
  about why an in-body role check doesn't work inside a
  `SECURITY DEFINER` function).
- `usage_events` and `audit_logs` are invisible to a `viewer`, visible to
  an `owner`/`admin`.
- The Storage `artifacts` bucket policy correctly parses
  `organizations/{organization_id}/...` object paths and denies a
  non-member.

The invitations/membership-guardrail additions were verified the same
way, but against the real project directly (`SET ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "...", "role": "authenticated"}'`
per call, then cleaned up) — RLS bypasses table ownership and superuser
status only based on `current_user`, so this genuinely exercises policies
even from a superuser connection, the same technique that caught the
`session_user`-vs-`current_user` bug in Phase 2:

- `get_invitation_preview()` returns the invite as `anon`; a direct
  `select * from invitations` as `anon` returns zero rows.
- `accept_invitation()` rejects a token whose invitation email doesn't
  match the caller's, one that's expired, and one that's been revoked —
  each with its own message — and succeeds for the real matching case,
  actually creating the `organization_members` row, marking the
  invitation `accepted`, and writing the audit log entry.
- An admin cannot `UPDATE` their own row to `owner`, and cannot `UPDATE`
  or `DELETE` the real owner's row (both silently affect zero rows,
  since the policy hides the row rather than erroring).
- An owner can grant `owner` to someone else; once two owners exist,
  either can step down to `admin`. Once only one owner is left, that
  owner's own `UPDATE` (self-demote) and `DELETE` (self-remove) are both
  rejected by `prevent_last_owner_removal()`.

Phase 4's project/environment cross-org isolation was verified the same
way, directly against the real project, using a throwaway organization and
a throwaway `auth.users` row created and forged-JWT-tested inside a single
transaction that ends in `ROLLBACK` (so nothing persists — no cleanup step
needed):

- A member of one organization cannot `SELECT`, `UPDATE`, or `DELETE`
  another organization's project or environment by id — all affect/return
  zero rows, exactly like a nonexistent id, which is what lets
  `apps/web`'s `getProject()`/`getEnvironments()` return `null`/`[]` and
  the page call `notFound()` without ever distinguishing "wrong id" from
  "someone else's project."
- The same user attempting an `INSERT` of an environment under another
  organization's project — relying purely on the real `with check
  has_organization_role(organization_id, 'developer')` policy, no
  application-level guard — is rejected with an actual RLS policy
  violation (`42501: new row violates row-level security policy`).
- As a positive control, the same user's `INSERT`/`UPDATE`/`DELETE`
  against a project in *their own* organization all succeed — confirming
  the cross-org rejections above are real authorization checks, not a
  blanket deny.

This is also covered at the application layer: every Server Action in
`apps/web/src/app/(dashboard)/projects/actions.ts` and
`projects/[id]/actions.ts` re-scopes its query by the caller's
`organization_id` in addition to the row id (defense in depth — RLS is
the actual boundary, but a bug in one layer doesn't become an
authorization hole), exercised by the Vitest suites alongside each
action file.

## Test run / result model

`test_runs.status`: `created → queued → starting → running → analyzing →
completed | failed | cancelled`. The `analyzing` step is for the (future)
AI analysis pass. Not yet modeled: `timed_out`, `paused`,
`waiting_for_approval` — nothing produces them until the execution engine
exists; adding enum values later is a cheap, additive migration
(`ALTER TYPE ... ADD VALUE`).

`test_run_jobs` is the actual BullMQ job record (queue name, job id,
attempts, last error) — one run can have multiple jobs (retries, or a
fan-out per browser). `test_runs.status` is the run's own state, set by
the worker; it is not derived from job rows on every read.

`test_results.status`: `passed | failed | skipped | blocked`.

## Issues

`issues.status`: `open | in_progress | resolved | reopened | ignored |
duplicate`. `issues.severity`: `critical | high | medium | low`.
`evidence` is a JSONB array of `{ type, artifactId }` or `{ type: 'link',
url }` entries — the one genuinely dynamic column on the table; everything
else is a plain scalar/FK.

## Artifacts & Storage

`artifacts` rows are metadata only. The bytes live in the private
`artifacts` Storage bucket under:

```
organizations/{organization_id}/projects/{project_id}/test-runs/{test_run_id}/{filename}
```

The bucket's RLS policy parses that path with `storage.foldername()` and
checks `is_organization_member()` against the second path segment — same
authorization helper as every table policy. Only the service role
(workers) writes into the bucket; members only read.

## Credentials & secrets

Nothing sensitive is ever stored in a plain column. Both credential
secrets (`credentials`/`credential_secrets`) and OAuth tokens
(`integration_accounts`/`integration_account_secrets`) follow the same
split-table pattern:

1. A metadata table (readable by admins, in the normal RLS sense).
2. A sibling `..._secrets` table with **zero** RLS policies — RLS defaults
   to deny-all, so `anon`/`authenticated` can never reach it through
   PostgREST, full stop.
3. The actual secret value lives in
   [Supabase Vault](https://supabase.com/docs/guides/database/vault); the
   `..._secrets` table only stores which vault secret id belongs to which
   credential/account.
4. A single `SECURITY DEFINER` function per secret type
   (`get_credential_secret()`, `get_integration_access_token()`) is the
   only way to decrypt one, and `REVOKE ALL ... FROM PUBLIC` +
   `GRANT EXECUTE ... TO service_role` means only a worker — never a
   browser session — can call it.

Workers never log a decrypted secret, never pass it to an AI prompt
verbatim, and never include it in a screenshot; that discipline lives in
`workers/*` application code, not the database, but the database ensures
there is no path for a browser session to obtain the value at all,
regardless of what application code does.

## Usage tracking & billing

`usage_events` is an append-only ledger (`test_run | browser_minutes |
ai_request | ai_tokens | artifact_storage`, with `provider`, `model`,
`quantity`, `unit`, `estimated_cost_cents`). Only the service role
inserts; admins+ can read their organization's own events.
`subscriptions` (one row per organization) holds plan/seat/billing-period
state, updated only by a billing-provider webhook running as the service
role.

## Audit logging

Every audited action shares one row shape via `log_audit_event()`:

- **DB triggers** (can't be forgotten, security-sensitive):
  `organization_members` role changes, `credentials`
  insert/update/delete.
- **Application code** (call `log_audit_event()` directly — see the
  function's own doc comment in the migration): logins, invitations,
  project creation, test run creation/cancellation (cancellation also has
  a trigger as a backstop), issue status changes (also has a trigger),
  integration connect/disconnect, AI fix approvals (also has a trigger).

Logins specifically have no corresponding table row to hook a trigger off
of — they're a Supabase Auth event, not a Postgres write in this schema —
so they must go through a Supabase Auth Hook calling `log_audit_event()`,
which is not implemented in this phase.

## Local verification

This phase's migrations were first verified against a real local
PostgreSQL 16 instance (not Supabase's own local stack, which needs
Docker): every migration applies cleanly in order, the seed data loads,
and the RLS/constraint scenarios in the previous sections all pass.
`auth`, `vault`, and `storage` were stubbed locally to match Supabase's
real schemas closely enough to exercise `auth.uid()`, `auth.users`,
`vault.create_secret()`/`vault.decrypted_secrets`, and
`storage.objects`/`storage.foldername()` — the stub is not part of the
committed migrations.

## Real project

All 18 migrations are also applied to a real, hosted Supabase project
(ref `bkxkwwocpampseojowxs`, `eu-west-1`, Postgres 17) — see
`docs/environment-variables.md` for its URL/anon key and the seeded dev
login. This is what surfaced most of the follow-up migrations above:
`supabase_advisors` (security + performance) only run against a real
project, and the local stub's `auth`/`vault` schemas turned out to be
close enough to exercise RLS logic but not close enough to reproduce
Supabase's own default grants — the exact gap
`20250201000800_lock_down_function_privileges.sql`,
`20250201000900_revoke_public_execute_on_triggers.sql`, and (a third time,
on a Phase 3 trigger function) `20250201001400_lock_down_trigger_function.sql`
each closed. Both advisors are clean now except `rls_enabled_no_policy` on
`credential_secrets`/`integration_account_secrets` (INFO, intentional —
see "Credentials & secrets" above), `unused_index` (INFO, expected on
a database with no real traffic yet), and `auth_leaked_password_protection`
(WARN — a project-level Auth setting, not something a migration can
touch; enable it from the dashboard under Auth → Policies). Encryption
itself (Vault's actual at-rest crypto) now runs for real, since this
project ships `pgsodium`/Vault — the local stub never encrypted anything.

## Type generation

`packages/database/src/generated.ts` is generated from the real project
via:

```bash
pnpm --filter @qavio/database db:generate-types
```

Re-run it after any new migration and commit the result.

`packages/types` mirrors the same schema in camelCase, domain-shaped
interfaces (`Organization`, `Issue`, `Credential`, …) for application
code to use instead of raw snake_case rows.
