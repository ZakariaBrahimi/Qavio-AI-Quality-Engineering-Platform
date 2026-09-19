# Target Authentication for the QA Engine (Phase 7)

Not to be confused with `docs/authentication.md`, which covers how a
person signs into **Qavio itself**. This document covers something
different: how `PlaywrightTestExecutor` authenticates against the
**target application under test** when that target requires a login
before anything meaningful can be crawled or checked.

## The incident this fixes

A production Test Run against `https://partner-staging.mizaniyapay.dz/`
(an app that requires email + password + email OTP before any real page
is reachable) showed three symptoms:

1. `/test-runs/[id]` sometimes showed a dashboard error ("Couldn't load
   this test run") right after starting a run.
2. The run itself always finished `completed`.
3. Every screenshot was a byte-for-byte identical 4,253-byte blank image.

Root causes, investigated independently:

- **(1)** is the same realtime-refresh race `docs/test-run-engine.md`'s
  Realtime section already documents and commit `442fcd0` already fixed
  (`TestRunStatusPanel` throttles `router.refresh()` instead of calling it
  once per `postgres_changes` event). A run that redirects straight to a
  login page and stops (one page, a couple of seconds) is exactly the
  "fast-completing run" shape that made the race easy to hit — testing
  against an auth-gated target didn't introduce a new bug, it just
  reliably triggered an existing one. `TestRunStatusPanel` now also treats
  `blocked` as terminal (it didn't before this phase added the status),
  so it unsubscribes from Realtime for a blocked run the same as any other
  finished one.
- **(2)** — before this phase, `PlaywrightTestExecutor` had no concept of
  an authentication boundary. It crawled `/auth/login` exactly like any
  other page, the login page returned `200 OK` with no console errors, so
  the deterministic check passed and the run completed normally. The
  engine wasn't wrong about what it saw — it just had no way to represent
  "I successfully loaded a page I was never supposed to stop at."
- **(3)** — the screenshot was taken immediately after
  `waitUntil: 'domcontentloaded'` fired, which for a client-rendered login
  page can mean "the root `<div>` exists but the framework hasn't mounted
  yet." See "Evidence capture" below for the fix.

## Environment authentication model

`environments.auth_method` (`none` | `stored_state` | `credentials`,
default `none`) and `environments.auth_credential_id` — see
`supabase/migrations/20250201002200_environment_authentication.sql`.
Mirrored in `packages/types/src/environment.ts`'s `Environment` and
`EnvironmentAuthMethod`.

**Never inferred from the URL.** An environment's `base_url` pointing at
`/auth/login` or looking like a login-gated app doesn't change how Qavio
behaves — a Qavio user (admin role, see "Configuring authentication"
below) must explicitly choose an authentication method. Qavio never
attempts to log into a target it wasn't told to.

- **`none`** (default) — no authentication attempted. If the target
  redirects to what looks like a login page anyway, the run is marked
  `blocked`, not silently passed against the login page (see "Blocked Test
  Runs" below).
- **`stored_state`** — `auth_credential_id` points at a
  `playwright_storage_state` credential: a Playwright `storageState` blob
  (cookies + `localStorage`) captured from an already-authenticated
  session, applied to this run's own isolated `BrowserContext` via
  `browser.newContext({ storageState })`. This is the only implemented
  authentication method as of this phase.
- **`credentials`** — reserved for a future email/password (+ OTP) login
  flow. Modeled now so the type is stable across a future migration, but
  `PlaywrightTestExecutor` does not implement it. Selecting it always
  produces a `blocked` run with an explicit "not yet implemented" reason.
  See "Why not implement OTP now" below.

## Why not implement OTP now

Implementing a real email/password + OTP login flow would require one of:
reading a real inbox to retrieve the OTP (an email/SMS provider
integration Qavio doesn't have yet — this phase deliberately did not build
one speculatively), faking success without actually authenticating, or
hard-coding a real target's credentials into Qavio. All three are
explicitly out of scope. `stored_state` is the safe, honest first
implementation: a person authenticates once, outside Qavio, by hand or
with their own tooling, exports the resulting `storageState`, and gives
it to Qavio once. Qavio never sees the password or the OTP itself, only
the already-authenticated session state.

## Storage-state security model

A `storageState` blob is exactly as sensitive as a password or session
cookie — anyone who has it can act as the authenticated user until the
session expires. It is treated that way everywhere in this system:

- **In transit**: only ever submitted through
  `saveEnvironmentStoredState` (`apps/web/src/app/(dashboard)/projects/[id]/actions.ts`),
  a `"use server"` Server Action — never a client-side fetch to a public
  API route, never a GET parameter, never logged.
- **At rest**: written to Supabase Vault via `create_credential_secret()`
  (`supabase/migrations/20250201002200_environment_authentication.sql`),
  the write-side counterpart to the existing `get_credential_secret()`.
  Both are `SECURITY DEFINER` functions with **no in-body role check** —
  access is controlled entirely by explicit
  `revoke ... from public, anon, authenticated` /
  `grant ... to service_role`, because Supabase grants new functions
  EXECUTE directly to `anon`/`authenticated` by default, not just via
  `PUBLIC` (the exact gap `20250201002300_lock_down_create_credential_secret.sql`
  closed after the security advisor caught it — see that migration's own
  comment). The `credentials` table row (name, type, id) is ordinary
  RLS-gated metadata, admin-role only; the secret value itself lives in
  `vault.decrypted_secrets` and is never reachable through PostgREST at
  all.
- **Never re-displayed**: `EditEnvironmentDialog`'s textarea always starts
  empty, even when a `stored_state` credential is already configured. The
  UI can show *that* a credential is configured (a badge, "configured —
  paste to replace") but never *what* it contains.
- **Never sent to the frontend**: `Environment.authCredentialId` is just
  an opaque id — safe to send to the browser, same as any other foreign
  key. The secret itself is fetched only by `workers/web`, server-side,
  scoped to the run's own organization/project
  (`repository.loadCredentialSecret` — see "Cross-tenant isolation"
  below).
- **Never logged**: nothing in `workers/web` ever `console.log`s a
  resolved `storageState` or a raw secret. `resolveAuthContext`'s
  `unavailable` reasons are static strings, never the secret's contents.
- **Never in Redis / the BullMQ payload**: the job payload carries only
  `environmentId`; `PlaywrightTestExecutor.execute` resolves the
  credential fresh, in the worker process, on every run — the same
  pattern `loadExecutionTarget` already used for `base_url` before this
  phase.
- **Never reaches the AI analysis layer**: Phase 8 (AI root-cause
  analysis) doesn't exist yet, so there is nothing to violate this today —
  documented here as a hard constraint for whoever builds it:
  `TestExecutionResult`/`TestResult`/artifacts never carry a `storageState`
  or any other secret value, only pass/fail/blocked evidence, so an AI
  prompt built from those has nothing secret to leak by construction.
- **Never in a Test Run's evidence**: screenshots and JSON reports are
  captured *using* the authenticated context, never a rendering *of* the
  credential itself.

## Cross-tenant isolation

- `validate_environment_auth_credential()` (a `BEFORE INSERT OR UPDATE`
  trigger on `environments`) enforces that `auth_credential_id` belongs to
  the *same project* as the environment, at the data layer — not just a
  bare foreign key, which would only prove the credential exists
  *somewhere*.
- `repository.loadCredentialSecret` (`workers/web/src/repository.ts`)
  re-proves the same thing independently, at read time: it first queries
  `credentials` scoped to the run's own `organization_id` **and**
  `project_id` from the job's own claims, and only calls
  `get_credential_secret()` if that row exists. A credential id that's
  real but belongs to a different organization or a different project in
  the same organization comes back `null` — same error shape as "doesn't
  exist" — never a raw query error that could hint at whether the id
  exists at all.
- A frontend user can never request an arbitrary credential id: the only
  UI path that resolves a credential is `environments.auth_credential_id`,
  set exclusively by `saveEnvironmentStoredState`/`setEnvironmentAuthMethod`,
  both of which write it themselves — there's no form field where a user
  types a credential id directly.
- Browser context isolation is unchanged from Phase 7's original design
  (`docs/playwright-qa-engine.md`): every run still gets its own fresh
  `BrowserContext`, `storageState` is applied once at `browser.newContext()`
  time via `BrowserManagerOptions.storageState`, and the context is
  destroyed in `withBrowserContext`'s `finally` block. Two runs against
  the same environment never share a context, and a run's authenticated
  state can never leak into a different run's context — including a
  different environment or organization's run on the same worker process.

## Blocked Test Runs

`'blocked'` is a new terminal `test_run_status`
(`packages/types/src/test-run.ts`'s `TEST_RUN_TRANSITIONS`, reachable from
`queued`/`starting`/`running`/`analyzing`, itself terminal). It exists
because "the target requires authentication Qavio isn't configured to
satisfy" is neither a passing check nor a defect in the target
application — conflating it with `failed` would misdirect whoever reads
the result into debugging an application that isn't actually broken, and
conflating it with `completed` (the pre-fix behavior) is worse: an
authentication gap silently reported as a passing QA run.

A run becomes `blocked` in exactly two situations, both handled in
`crawlSite` (`workers/web/src/executors/playwright-executor.ts`):

1. **Authentication couldn't be resolved before crawling started** —
   `auth_method` is `stored_state` with no credential attached, a
   credential that doesn't parse as a valid `storageState`, or
   `auth_method` is `credentials` (not implemented). `resolveAuthContext`
   (`workers/web/src/security/auth-context.ts`) returns
   `{ kind: 'unavailable', reason }`; the crawl still runs exactly one
   real page check against the environment's `base_url` so the run has
   genuine evidence (HTTP status, a real screenshot, the final URL) rather
   than zero pages, then reports `blocked` with `reason` as the run-level
   `errorMessage`.
2. **The entry page redirects to what looks like an authentication
   boundary** — checked only for the crawl's first page (depth 0):
   `looksLikeAuthBoundary(new URL(finalUrl))` matches a small, deliberately
   narrow set of conventional login-page path shapes (`/login`,
   `/auth/login`, `/signin`, `/sign-in`, `/sso`, `/authenticate`, …), and
   the final URL's path differs from the originally requested path (i.e. a
   redirect actually happened). This is evidence the crawler landed on a
   login page, not a claim about *why* — a legitimate page that happens to
   live at a matching path without ever having redirected there doesn't
   trigger it. Deeper pages are never checked against this heuristic: a
   redirect discovered several hops into a crawl is far more likely to be
   an ordinary in-app login-gated sub-feature than the whole target being
   behind an authentication boundary, and misclassifying that would hide a
   real finding.

Either way, `crawlSite` relabels every result it already collected (at
most one) to `TestResultStatus: 'blocked'` too, so the dashboard's
per-page results table never shows a `passed`/`failed` page underneath a
run whose overall status is `blocked`, and stops — no further pages are
queued. `test-runs/[id]/page.tsx` renders a dedicated warning `Alert` for
a blocked run's `errorMessage`, distinct from the destructive `Alert`
shown for `failed`.

**Never an application defect.** A blocked run's evidence (initial URL,
final URL, the detected authentication page, a real screenshot, a JSON
report) is exactly the same shape `docs/playwright-qa-engine.md` already
documents for a normal check — a QA engineer reads the same page they
always would, sees "this is a login page," and knows the actionable next
step is "configure authentication for this environment," not "someone
broke the login page."

## Evidence capture — no more blank screenshots

`run-page-check.ts` navigates with `waitUntil: 'domcontentloaded'`, which
for a client-rendered SPA can fire while the page is still an empty root
element — before the framework has mounted or painted anything. Before
this phase, the screenshot was taken immediately after that. Now, a
bounded `await page.waitForLoadState('networkidle', { timeout:
RENDER_SETTLE_TIMEOUT_MS })` (3 seconds) runs first — deliberately **not**
a fixed sleep: most pages settle well under the timeout and proceed
immediately; a page that never goes network-idle (persistent polling,
analytics beacons) simply proceeds once the timeout elapses, exactly as it
would have before this existed. This is deterministic in the sense that
matters here — a bounded wait for a real readiness signal, not a race
against an arbitrary clock — while staying short enough that one slow
page can't meaningfully extend a whole crawl's duration.

If a page is genuinely blank after that wait (a real rendering failure,
not just "hadn't finished yet"), the screenshot still shows blank — that's
correct behavior, not a bug: evidence should reflect what actually
rendered, never a manufactured "looks fine" screenshot.

## Configuring authentication (production)

An **admin** (or owner) role, from an environment's edit dialog
(`apps/web/src/components/environments/edit-environment-dialog.tsx`):

1. Open the environment's **Edit** dialog and scroll to **Authentication**.
2. Choose **Pre-authenticated session** (`stored_state`).
3. Paste a Playwright `storageState` JSON blob — capture one outside Qavio
   with `await context.storageState({ path: 'state.json' })` (or
   `storageState()` with no path, for the object form) against the real
   target, signed in by hand or with the target's own tooling. Never type
   a real password anywhere in Qavio; this form never asks for one.
4. Click **Save stored session state**.

This is admin-gated stricter than ordinary environment editing
(`manage_environments`, developer+) because it's the one action that
receives a secret value — see `saveEnvironmentStoredState`'s own doc
comment in `actions.ts`.

`setEnvironmentAuthMethod` (no secret involved) is also admin-gated for
consistency, even though it only ever touches `auth_method`/
`auth_credential_id`, never a secret value directly.

## What this phase does not do

- No email/password + OTP login flow (`credentials` method, see "Why not
  implement OTP now").
- No credential rotation UI beyond "paste a new one" (re-saving a
  `stored_state` credential replaces the Vault secret in place via
  `create_credential_secret`'s `on conflict (credential_id) do update`;
  there's no scheduled expiry check or "this session may be stale"
  warning).
- No way to delete an orphaned credential from the UI once an environment
  switches away from `stored_state` — the row is detached
  (`auth_credential_id` set to `null`) but not deleted, a bounded,
  documented tradeoff matching the same pattern `writeArtifacts`' own
  retry comment already uses elsewhere in this codebase.
- `looksLikeAuthBoundary`'s path pattern is deliberately narrow — a target
  whose login page lives at an unconventional path (not matching
  `/login`, `/auth/login`, `/signin`, etc.) redirecting there will not be
  detected as an authentication boundary today, and will be crawled and
  checked like any other page (same pre-this-phase behavior for that
  specific shape of target).
- Same explicit out-of-scope list as `docs/playwright-qa-engine.md`: AI
  root-cause analysis, AI Fix Engineer, mobile QA, API QA, security
  scanning, visual regression testing, Jira/CI-CD integration.
