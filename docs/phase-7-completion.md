# Phase 7 Completion Checkpoint

**Phase 7 — Real Playwright Web QA**

**Status: COMPLETE / VERIFIED IN PRODUCTION**

Verified: 2026-09-19

This document is the repository source of truth for the completed Phase 7
implementation. Future development sessions should inspect this document
and the referenced code/tests before making assumptions about Phase 7 —
do not rely on prior conversation history.

## 1. What Phase 7 is

Phase 7 replaces Phase 6's deterministic placeholder executor with a real
browser-based QA engine for `web`-platform projects: it launches Chromium,
conservatively crawls a project's configured environment starting from its
`base_url`, runs a deterministic functional check on each page reached, and
persists factual evidence (HTTP status, console/network errors, a
screenshot) — see `docs/playwright-qa-engine.md` and
`docs/test-run-engine.md` for the full design writeup.

## 2. Production Deployment

Verified via the Railway MCP integration and the repository's own deploy
tooling:

| Field | Value |
| --- | --- |
| Railway service | `@qavio/worker-web` |
| Verified deployment ID | `505d752e-2d07-41f9-a293-b572deb79d75` |
| Deployed commit | `0e7d8ca7f85165249ece2a4292181069c14db198` |
| Branch | `claude/qavio-foundation-monorepo-km51uh` |
| Deployment status | `SUCCESS` |
| Service state | `live`, no crash-loop, no staged changes |
| Builder | Dockerfile (`workers/web/Dockerfile`), root directory `/` |
| Worker runtime | Node 20 (build stage: `node:20-bookworm-slim`; esbuild bundle, CJS, target `node20`) |
| Playwright version | `1.56.0` (`workers/web/package.json`) |
| Chromium / runtime image | `mcr.microsoft.com/playwright:v1.56.0-noble` — version-pinned to match the `playwright` npm package exactly |
| Process supervision | `tini` as PID 1 (reaps zombie Chromium processes, forwards `SIGTERM`) |
| Networking | No public domain, no `EXPOSE` — this is a BullMQ consumer, not an HTTP service |
| Concurrency | `WORKER_CONCURRENCY=1` |

Source: `workers/web/Dockerfile`, `workers/web/package.json`, and a live
Railway `describe-service`/`list-deployments` query against this service.

## 3. Verified Production E2E Test Run

**Test Run ID: `646444c6-07fd-48f5-a5d6-17e87ea9048c`**

Verified directly against the production Supabase project (`test_runs`,
`test_results`, `artifacts`, and `storage.objects`) and Railway's deploy
logs for deployment `505d752e-2d07-41f9-a293-b572deb79d75` — not from
conversation memory.

Factual sequence, as observed:

1. **BullMQ job received** — Railway deploy log: `"Test run job received"`
   at container startup, with `testRunId`/`jobId` = `646444c6-…`.
2. **Worker executed the job** — routed through `RoutingTestExecutor` to
   `PlaywrightTestExecutor` (the run's project platform is `web`).
3. **Chromium launched** — via `withBrowserContext` (`browser-manager.ts`),
   one isolated `BrowserContext` for this run.
4. **Target navigated** — the environment's configured `base_url`; the
   page's own URL at check time was `https://partner-staging.mizaniyapay.dz/`.
5. **Checks executed** — one deterministic page check (`runPageCheck`):
   navigation/load, HTTP status, console errors/warnings, network
   failures, page errors, screenshot capture.
6. **Supabase `test_runs` state updated**:
   - `status`: `completed`
   - `started_at`: `2026-09-19 14:19:43.673+00`
   - `finished_at`: `2026-09-19 14:19:49.297+00`
   - `summary`: `{"pagesChecked": 1, "pagesPassed": 1, "pagesFailed": 0, "cancelled": false}`
7. **`test_results` row written**: 1 row, `status = passed`,
   `duration_ms = 2229`, `error_message = null`.
8. **Artifacts stored** — 2 artifacts for that result, confirmed present
   both as rows in the `artifacts` table and as objects in
   `storage.objects` (bucket `artifacts`):
   - `…/root.png` — `kind: screenshot`, `image/png`, 4253 bytes
   - `…/root.json` — `kind: json_report`, `application/json`, 268 bytes
   - Storage path convention: `organizations/{orgId}/projects/{projectId}/test-runs/{testRunId}/{filename}`
9. **BullMQ job completed** — Railway deploy log: `"BullMQ job completed"`.
10. **Dashboard displayed the result** — `apps/web/src/app/(dashboard)/test-runs/[id]/page.tsx`
    reads `test_runs`, `test_results`, and `artifacts` (via
    `getTestRun`/`getTestResults`/`getArtifactsForResults`) and renders the
    status badge, summary panel, and a results table with linked
    artifacts — confirmed by reading the page component directly, not
    assumed.

**Pages checked:** 1. **Passed:** 1. **Failed:** 0.

No AI interpretation or root-cause analysis occurred anywhere in this run
— every value above is a directly observed fact (HTTP status, a duration,
a byte count, a timestamp), not a diagnosis. Phase 7 is deterministic QA.

## 4. Architecture

```
User
  ↓
Qavio Web (Next.js, apps/web)
  ↓ (createTestRun Server Action)
Supabase (test_runs row: created → queued)
  ↓ (BullMQ producer, packages/queue)
Redis (queue "test-runs")
  ↓ (BullMQ consumer)
Railway — @qavio/worker-web (long-lived process)
  ↓
RoutingTestExecutor → PlaywrightTestExecutor
  ↓
Playwright + Chromium (isolated BrowserContext per run)
  ↓
Target Web Application (the project's configured environment base_url)
  ↓
Results + Artifacts (screenshot, JSON report)
  ↓
Supabase (test_results, artifacts, artifacts Storage bucket, test_runs status/summary)
  ↓
Qavio Dashboard (apps/web /test-runs/[id])
```

Architectural boundaries, verified against the code:

- **`apps/web`** is the control plane (Next.js) — it creates/cancels test
  runs and enqueues jobs; it never runs Playwright itself.
- **Railway** runs the long-lived `@qavio/worker-web` process — the only
  place Playwright/Chromium executes.
- **Supabase** (Postgres) is the source of truth for Test Run state and
  results (`test_runs`, `test_results`, `test_run_jobs`) — the worker
  writes every state transition through one shared, centralized map
  (`assertTestRunTransition`, `packages/types/src/test-run.ts`), imported
  by both the control plane and the worker so neither can drift.
- **Redis/BullMQ** (queue name `test-runs`, `packages/queue`) is the job
  coordination layer only — it carries a job payload (IDs), never a
  run's actual configuration or results.
- **Supabase Storage** (bucket `artifacts`) stores artifact bytes;
  `artifacts` table rows carry the metadata/reference.
- **`TestExecutor`** (`packages/queue`'s interface) remains
  executor-agnostic — `worker.ts`'s orchestration (state machine,
  timeout, cancellation polling, retries) has no knowledge of Playwright.
- **`RoutingTestExecutor`** (`workers/web/src/executors/routing-executor.ts`)
  is the one place that selects an executor by project platform: `web` →
  `PlaywrightTestExecutor`, everything else → `PlaceholderTestExecutor`.
- **`PlaywrightTestExecutor`** performs the real web QA (target
  validation, crawl, per-page checks, artifact capture) and implements
  nothing else.
- **No AI interpretation** happens inside `PlaywrightTestExecutor` or
  anywhere else in Phase 7 — every check module (`checks/run-page-check.ts`,
  `checks/basic-page-check.ts`) records observed facts only.

## 5. Security Controls

Verified against `workers/web/src/security/target-validation.ts`,
`workers/web/src/security/route-guard.ts`,
`workers/web/src/crawler/discover-links.ts`,
`workers/web/src/browser-manager.ts`, and their test files.

| Control | Verified in |
| --- | --- |
| SSRF protection | `target-validation.ts` — `validateTargetUrl`, checked before any navigation |
| Private/internal IPv4 blocking (loopback, RFC1918, link-local, CGNAT, docs/benchmark ranges) | `BLOCKED_IPV4_CIDRS` in `target-validation.ts` |
| IPv6 validation (loopback, link-local, unique-local) | `isBlockedIPv6` in `target-validation.ts` |
| IPv6-mapped/NAT64 IPv4 address unwrapping | `extractMappedIPv4` in `target-validation.ts` (blocks `::ffff:169.254.169.254`-style bypasses) |
| Cloud metadata endpoint protection | `169.254.0.0/16` in `BLOCKED_IPV4_CIDRS`, plus literal hostname `metadata.google.internal` |
| DNS-resolved (not just literal) IP validation | `dns.lookup(hostname, { all: true })` in `validateTargetUrl` — every resolved address is checked, not just the hostname string |
| Same-origin restriction (navigation) | `isSameOrigin` (`target-validation.ts`) + enforced per-request in `route-guard.ts` |
| Redirect protection | `route-guard.ts` intercepts every hop of a redirect chain via context-scoped `context.route('**/*', …)`, not just the initial URL |
| Cross-origin request interception | `route-guard.ts` — navigations off-origin are blocked; cross-origin sub-resources are allowed only after passing the same SSRF check |
| Destructive-path filtering | `DESTRUCTIVE_PATH_PATTERN` in `discover-links.ts` (logout/delete/deactivate/unsubscribe/etc. — never crawled) |
| Download-link filtering | `DOWNLOAD_EXTENSION_PATTERN` in `discover-links.ts` |
| No clicking / no form submission | The crawler only follows `<a href>` links; nothing in Phase 7 clicks an element or submits a form |
| Target restricted to configured environment | `PlaywrightTestExecutor.execute` loads `baseUrl` fresh from `environments.base_url` via `repository.loadExecutionTarget` — never from the queue job payload |
| Browser context isolation | `withBrowserContext` (`browser-manager.ts`) creates a fresh `Browser` + `BrowserContext` per run, with no `storageState` — cookies/localStorage/sessionStorage/auth state are never shared across runs |
| Execution limits | `maxPages` (≤30), `maxDepth` (≤5), `maxDurationMs` (≤300s), `navigationTimeoutMs` (≤30s) — clamped server-side in `playwright-executor.ts`'s `readCrawlLimits`, a run's `configuration` can only request tighter limits, never looser ones |
| Cancellation | `worker.ts`'s `executeWithTimeout` polls `test_runs.status` every second and aborts the executor's signal on external cancellation; `crawlSite` checks the signal between pages |
| Retries / idempotency | `worker.ts` treats an already-finished run as a no-op; `writeTestResults` deletes-then-inserts so a retried job never duplicates rows |
| Artifact access control | `supabase/migrations/20250201000700_storage.sql` — the `artifacts` bucket is private; only an org's own members can read via RLS policy; only the service role (the worker) can write — no insert/update/delete policy exists for `anon`/`authenticated` |
| Server-side-only secrets | `SUPABASE_SERVICE_ROLE_KEY`/`REDIS_URL` are read only in `workers/web` server code (`index.ts`, via `createEnv(workerEnvSchema)`); never referenced from any client-facing bundle |
| No secrets in test payloads | The BullMQ job payload (`TestRunJobPayload`) carries only IDs (org/project/environment/testRun); no credentials ever pass through Redis or into a run's persisted evidence |

## 6. Test / Verification Evidence

Fresh run, same session as this checkpoint:

- **`workers/web` tests: 118 passed, 0 failed, across 11 files.**
  - `security/__tests__/target-validation.test.ts` — 35 tests (SSRF/IP-range/IPv6-mapped/metadata coverage)
  - `security/__tests__/route-guard.test.ts` — 4 tests
  - `crawler/__tests__/discover-links.test.ts` — 26 tests
  - `checks/__tests__/run-page-check.test.ts` — 9 tests
  - `__tests__/basic-page-check.test.ts` — 2 tests
  - `__tests__/browser-manager.test.ts` — 4 tests
  - `executors/__tests__/playwright-executor.test.ts` — 7 tests (crawls a real local HTTP fixture server, not an external site)
  - `executors/__tests__/routing-executor.test.ts` — 5 tests
  - `__tests__/placeholder-executor.test.ts` — 5 tests
  - `__tests__/worker.test.ts` — 9 tests (state machine, cancellation, idempotency, retries)
  - `__tests__/repository.test.ts` — 12 tests
- **Full monorepo test suite:** all packages passing (`pnpm test`).
- **Lint:** clean, `--max-warnings=0`, all workspace packages (`pnpm lint`).
- **Typecheck:** clean, all workspace packages (`pnpm typecheck`).
- **Build:** `apps/web` (Next.js) and `workers/web` (esbuild bundle,
  ~2.5MB `dist/index.js`) both build successfully.
- **Production deployment status:** `SUCCESS` (Railway deployment
  `505d752e-2d07-41f9-a293-b572deb79d75`), service `live`, no crash-loop.
- **Real production E2E status:** verified — see Section 3, checked
  directly against Supabase and Railway logs, not inferred.

## 7. Known Limitations

- The verified production run (`646444c6-…`) reached only 1 page — no
  further same-origin links were discovered from that page (or the
  crawl's depth/page limits applied). This reflects that specific
  target's link structure at verification time, not a crawler defect;
  multi-page crawling itself is exercised by `playwright-executor.test.ts`
  ("crawls a real multi-page site end to end and reports a result per
  page with a screenshot artifact each").
- Artifact Storage blobs from a superseded retry attempt are not
  proactively deleted when a job retries — a bounded, documented resource
  leak (see `writeArtifacts`'s doc comment in `repository.ts`), not a
  correctness issue, since the superseded blob's DB row is gone and
  nothing ever displays or references it.
- AI QA analysis is not implemented in Phase 7 — the `analyzing` status
  exists in the state machine's type (`packages/types/src/test-run.ts`)
  for a future phase, but nothing in this codebase ever produces it.
- Visual QA is not implemented in Phase 7.
- Mobile QA is not implemented in Phase 7.
- Security scanning is not implemented as a Phase 7 feature.
- `PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST` (a local-dev-only SSRF bypass
  for testing against `apps/qa-fixture`) is confirmed unset in the
  production Railway environment.

## 8. Exact Phase 7 Acceptance Criteria

- [x] Real Playwright execution works in production (verified: Test Run `646444c6-…`).
- [x] Worker runs independently from the web app, as its own long-lived Railway service (`@qavio/worker-web`), not inside `apps/web`/Vercel.
- [x] Chromium launches successfully in the deployed container (`browser-manager.ts`, verified via the production run's screenshot artifact).
- [x] Real target web pages can be tested (verified against `https://partner-staging.mizaniyapay.dz/`).
- [x] Navigation/load checks work (`runPageCheck`'s `page.goto` + status handling).
- [x] HTTP status checks work (`httpStatus`/`response.ok()` in `runPageCheck`).
- [x] Console error/warning checks work (`onConsole` in `runPageCheck`).
- [x] Network failure checks work (`onRequestFailed`, `subResourceErrorResponses` in `runPageCheck`).
- [x] Page error checks work (`onPageError` in `runPageCheck`).
- [x] Same-origin crawling works (`discoverLinks` + `isSameOrigin`, 26 tests).
- [x] Redirect/cross-origin protections work (`route-guard.ts`, 4 tests).
- [x] SSRF/private-network protections work (`target-validation.ts`, 35 tests).
- [x] Browser contexts are isolated per Test Run (`withBrowserContext`, no `storageState`).
- [x] Screenshots/evidence are generated (verified artifact: `root.png`, 4253 bytes).
- [x] Artifacts are stored in Supabase Storage (verified: `storage.objects`, bucket `artifacts`).
- [x] Artifact metadata is stored in the database (verified: `artifacts` table rows).
- [x] Test Run state transitions work correctly (`transitionTestRun` via the shared `assertTestRunTransition` map; verified `queued → starting → running → completed` on the production run).
- [x] Cancellation works (`worker.test.ts` — external-cancellation-mid-run coverage; polling in `executeWithTimeout`).
- [x] Retries/idempotency work (`worker.test.ts`; `writeTestResults` delete-then-insert).
- [x] Results appear in the dashboard (`/test-runs/[id]/page.tsx`, verified by reading the component).
- [x] Production E2E has been verified (Section 3 — checked directly against Supabase/Railway, not assumed).
- [x] No secrets are exposed to the frontend or test payloads (`SUPABASE_SERVICE_ROLE_KEY`/`REDIS_URL` are worker-only env vars; the BullMQ job payload carries only IDs).

## 9. Phase Boundary

Phase 7 is **deterministic web QA only**. `PlaywrightTestExecutor` and
every check module it calls produce factual evidence — an HTTP status, a
console error string, a screenshot, a duration — and nothing in this
phase interprets that evidence, explains a failure's root cause, or
suggests a fix. That interpretation layer is explicitly out of scope here
and belongs to a later phase; adding it was not part of this checkpoint
and nothing in Phase 7's code path calls out to an AI provider.

Also out of scope for Phase 7, unchanged from Phase 6: visual QA, mobile
QA, security scanning, and any executor other than
`PlaywrightTestExecutor` (`web` projects) and `PlaceholderTestExecutor`
(`mobile`/`api` projects, unchanged from Phase 6).

## 10. Source of Truth Rule

This document is the repository source of truth for the completed Phase 7
implementation. Future development sessions should inspect this document
and the referenced code/tests before making assumptions about Phase 7.
