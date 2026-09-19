# Playwright Web QA Engine (Phase 7)

Turns Phase 6's `PlaceholderTestExecutor` into a real browser-based
functional QA engine for `web`-platform projects. Builds entirely on
Phase 6's architecture (see `docs/test-run-engine.md`) — `worker.ts`'s
orchestration, the `TestExecutor` interface, the state machine, retries,
idempotency, Realtime updates, and authorization are all unchanged.
`mobile`/`api` projects still get `PlaceholderTestExecutor`.

## Scope

A Qavio user selects a `web` project and environment, starts a
Functional Test Run, and the worker launches a real headless Chromium,
conservatively crawls the environment's configured base URL, runs a
deterministic functional check on each page it discovers, captures
evidence (screenshots, a JSON report per page), and persists
results/artifacts the same way Phase 6 does.

**Explicitly out of scope** (same phase boundary as Phase 6's own "what
this doesn't implement" section): AI-driven test generation or failure
analysis, AI-generated fixes, visual regression / responsive QA, mobile
testing, security scanning. This engine only ever produces factual
evidence ("this page returned a 500", "this console error occurred") —
never a diagnosis ("this is a bug", "the root cause is…").

## Architecture

```
worker.ts (unchanged)
  -> RoutingTestExecutor            (workers/web/src/executors/routing-executor.ts)
       web project?    -> PlaywrightTestExecutor
       mobile/api?     -> PlaceholderTestExecutor (Phase 6, unchanged)

PlaywrightTestExecutor              (workers/web/src/executors/playwright-executor.ts)
  1. resolveTarget(context)         -> the environment's base_url + project platform
  2. validateTargetUrl(baseUrl)     -> SSRF gate, once, before launching anything
  3. withBrowserContext(...)        -> one Chromium instance + one fresh, isolated
                                        BrowserContext per run (browser-manager.ts)
  4. crawlSite(...)                 -> installs the route guard, then BFS-crawls
       installRouteGuard(...)       -> per-request SSRF/same-origin check (route-guard.ts)
       runPageCheck(...)            -> navigate, collect evidence, screenshot (checks/)
       discoverLinks(...)           -> same-origin, non-destructive link filtering (crawler/)
```

Each module is independently unit-tested against a real local HTTP
server and (where relevant) real Chromium — never a mocked Playwright
object. See each file's own tests under its `__tests__/` directory.

## Target URL security (SSRF protection)

Two layers, because a same-origin page can redirect anywhere and a page
can probe internal addresses via `<img>`/`fetch` regardless of where it
was served from:

1. **`validateTargetUrl`** (`security/target-validation.ts`) — called
   once, on the environment's own `base_url`, before a browser is even
   launched. Rejects a malformed URL, a non-http(s) protocol, a literal
   blocked hostname (`localhost`, `metadata.google.internal`, …), and —
   the part a hostname-string check alone can't catch — every IP address
   the hostname actually resolves to, checked against loopback,
   RFC1918 private ranges, link-local (this is what blocks every major
   cloud's `169.254.169.254` metadata endpoint), and several reserved
   ranges. Also unwraps IPv4-mapped/NAT64 IPv6 addresses (both the
   dotted-decimal and hex-group forms) before checking them — a
   well-known bypass otherwise sails straight through an IPv6-only
   check.
2. **`installRouteGuard`** (`security/route-guard.ts`) — installed once
   per crawl at the `BrowserContext` level, so it sees every request the
   crawl makes, including each hop of a redirect chain (Playwright
   surfaces each hop as its own intercepted request). Same-origin
   requests (the already-validated target itself) are always allowed.
   A cross-origin *navigation* is always blocked outright — the crawl
   never leaves the run's target site. A cross-origin *sub-resource*
   (a CDN, font, analytics script, or a page's own `<img>`/`fetch`
   probe) is allowed only after it independently clears the same
   `validateTargetUrl` check, with per-origin caching so a repeated
   third-party host isn't re-resolved on every request.

## Local development: `PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST`

Every address reachable from your own machine — `localhost`, `127.0.0.1`,
a LAN IP — is *correctly* rejected by `validateTargetUrl` in every
deployed environment. That also makes it impossible to run this engine
against `apps/qa-fixture` locally without an explicit, narrow exception.
`PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST` (see
`docs/environment-variables.md`) is that exception: a comma-separated
list of exact `hostname:port` entries allowed to bypass the
private/loopback check specifically, read once at worker startup — never
derived from a run's `configuration` or an environment's `base_url`
itself, and never set in a deployed environment.

## The crawler

`crawler/discover-links.ts` filters a page's raw `<a href>` values down
to what's worth visiting next: resolvable, http(s), same-origin as the
environment's base URL, not a download link (`.pdf`, `.zip`, …), not a
logout/destructive-looking path (`/logout`, `/account/delete`,
`/subscription/cancel`, …, matched on whole words so `deleterious-effects`
isn't a false positive), and not already seen. URLs are normalized
(fragment and query string stripped, trailing slash dropped except on
the root) both for de-duplication and to avoid query-parameter
explosions.

`PlaywrightTestExecutor`'s crawl is a plain breadth-first traversal
bounded by four configurable, capped limits (readable from a run's
`configuration`, silently clamped to a safe range rather than trusted
outright):

| Key                    | Default   | Cap        |
| ----------------------- | --------- | ---------- |
| `maxPages`              | 15        | 30         |
| `maxDepth`               | 2         | 5          |
| `maxDurationMs`          | 120,000   | 300,000    |
| `navigationTimeoutMs`    | 15,000    | 30,000     |
| `failOnConsoleError`     | `false`   | —          |

The crawler never clicks anything, fills in a form, or submits — it only
ever follows `<a href>` links it already decided were safe to visit. That
is the whole of Phase 7's "destructive action safety": there is no
button-clicking code path to guard, because there is no button-clicking
code path at all.

## Deterministic functional checks

`checks/run-page-check.ts` runs one page at a time: navigate (via
`page.goto`, bounded by `navigationTimeoutMs`), then record — as
evidence, not as automatic failures — every console error/warning,
every failed sub-resource request, every non-2xx/3xx sub-resource
response, and any uncaught page error. A check only fails outright on:

- Navigation itself failing (timeout, DNS failure, connection refused).
- The main document responding with a non-2xx/3xx status.
- A console error, but **only** when a run's `configuration` explicitly
  sets `failOnConsoleError: true` — off by default, matching the "don't
  automatically claim this is a bug" requirement.

Network sub-resource failures never fail a check on their own — a
third-party analytics script timing out isn't this app's bug.

Each check also captures a screenshot (best-effort — a failed capture
never masks the real result) and a `json_report` artifact holding the
full structured evidence (console errors/warnings, network failures,
sub-resource error responses, page errors) — that JSON is where a
reviewer goes to inspect *why* a page's evidence looks the way it does,
without overloading the single-string `test_results.error_message`
field.

## Cancellation

The crawl loop checks the run's `AbortSignal` between pages, same as
Phase 6's `PlaceholderTestExecutor`. Because a single page check can take
up to `navigationTimeoutMs` (up to 30s), each check is additionally
raced against the signal (`runPageCheckOrAbort`) so a cancellation mid-
navigation is noticed within roughly one event-loop tick rather than
having to wait out the full navigation timeout — well inside
`worker.ts`'s own 5s abort grace period (see
`docs/test-run-engine.md#cancellation`). Whatever page was in flight when
cancellation is detected contributes no result; the browser context and
its underlying connections are torn down by `withBrowserContext`'s own
`finally` block once `execute` returns.

## Artifacts and persistence

Executors never touch Supabase directly (same boundary as Phase 6):
`PlaywrightTestExecutor` returns raw bytes + metadata
(`TestExecutionArtifact[]`), and `worker.ts`'s existing orchestration
calls `repository.writeArtifacts` to upload each one to the `artifacts`
Storage bucket and record its row — the same path convention and RLS
policy Phase 1 already established
(`organizations/{orgId}/projects/{projectId}/test-runs/{testRunId}/{filename}`).
`test_runs.progress` (a short live status line, e.g. "Checking page 3 of
up to 15: …") and `test_runs.summary` (pages checked/passed/failed,
whether the run was cancelled) are new columns added in this phase,
written through the same `transitionTestRun` call Phase 6 already made —
no new persistence mechanism, no second Realtime subscription.

## Running it locally

```bash
supabase start
docker compose up -d redis

# Terminal 1 — the fixture app Phase 7 crawls
pnpm --filter @qavio/qa-fixture dev     # http://localhost:4310

# Terminal 2 — the web app
pnpm --filter @qavio/web dev

# Terminal 3 — the worker, with the local SSRF allowlist set
PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST=127.0.0.1:4310 pnpm worker:web
```

Then create a `web`-platform project with an environment whose base URL
is `http://127.0.0.1:4310`, start a Functional Test Run, and watch it
progress through the dashboard.

## What Phase 7 deliberately does not implement

AI analysis, AI-generated fixes, visual regression QA, responsive QA,
mobile testing, security scanning — all later phases. Authenticated
testing (crawling behind a login) is deferred: nothing in this phase
attempts to authenticate a crawl session. Playwright traces and video
recording are deferred — only a screenshot and a JSON report are
captured per page today.
