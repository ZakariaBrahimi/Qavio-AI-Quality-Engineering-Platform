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

This phase's migrations were verified against a real local PostgreSQL 16
instance (not Supabase's own local stack, which needs Docker): every
migration applies cleanly in order, the seed data loads, and the RLS/
constraint scenarios in the previous sections all pass. `auth`, `vault`,
and `storage` were stubbed locally to match Supabase's real schemas
closely enough to exercise `auth.uid()`, `auth.users`,
`vault.create_secret()`/`vault.decrypted_secrets`, and
`storage.objects`/`storage.foldername()` — the stub is not part of the
committed migrations. Encryption itself (Vault's actual at-rest crypto)
was not exercised locally, since the stub doesn't encrypt; that only runs
for real on Supabase's own Postgres image, which ships `pgsodium`/Vault.

## Type generation

`packages/database/src/generated.ts` is hand-authored to mirror what
`supabase gen types typescript` would produce, since this repository
isn't linked to a live Supabase project yet. Once it is, regenerate with:

```bash
pnpm --filter @qavio/database db:generate-types
```

`packages/types` mirrors the same schema in camelCase, domain-shaped
interfaces (`Organization`, `Issue`, `Credential`, …) for application
code to use instead of raw snake_case rows.
