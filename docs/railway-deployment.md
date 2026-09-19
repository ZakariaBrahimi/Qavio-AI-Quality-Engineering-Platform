# Deploying `workers/web` to Railway

`workers/web` (`@qavio/worker-web`) is the BullMQ consumer that runs
Phase 7's Playwright QA engine. It is a persistent Node.js process, never
a Vercel/serverless function — see docs/test-run-engine.md's "Production
deployment" section. This doc covers making it deployable as a Railway
service; it does not change the worker's own architecture.

```
Vercel (apps/web)  →  Upstash Redis (BullMQ)  →  Railway (workers/web)  →  Playwright/Chromium  →  target app  →  Supabase
```

## What was actually broken

Before this change, `workers/web`'s `build` script (`tsc -p
tsconfig.build.json`) compiled only `workers/web/src` to
`dist/index.js`. Every `@qavio/*` workspace package it imports
(`config`, `types`, `database`, `queue`) ships **raw TypeScript** as its
`package.json` `main`/`types` field — there is no `dist/` for any of
them. That's fine for `apps/web` (Next.js's own bundler resolves `.ts`
directly) and for local dev (`workers/web`'s `dev` script uses `tsx
watch`, which does the same) — but a plain `node dist/index.js`, with no
bundler and no TypeScript loader in the way, cannot resolve those
workspace imports at all:

```
Error [ERR_UNSUPPORTED_DIR_IMPORT]: Directory import
'.../packages/config/src/env' is not supported resolving ES modules
imported from '.../packages/config/src/index.ts'
```

Confirmed by actually building and running it. This means the worker's
"production" path (`build` then `start`) has never actually worked —
only the dev path (`tsx watch`) has. Since Railway needs to run the
built output with plain `node`, this had to be fixed as part of making
the worker deployable at all.

## The fix: bundle instead of transpile

`workers/web`'s `build` script now uses `esbuild` to bundle
`src/index.ts` into one self-contained CommonJS file, inlining every
first-party (`@qavio/*`) module it imports. The one dependency kept
external is `playwright` itself — it resolves its own driver/browser
paths relative to its package directory at runtime and cannot be
bundled without breaking that.

```json
"build": "esbuild src/index.ts --bundle --platform=node --target=node20 --format=cjs --sourcemap --outfile=dist/index.js --external:playwright"
```

This is scoped entirely to `workers/web`'s own `build` script.
`packages/config`/`types`/`database`/`queue` are untouched — they still
ship raw TypeScript, and `apps/web`'s Next.js build (and Vercel
deployment) is completely unaffected. Local development is unaffected
too: `pnpm worker:web` still runs `tsx watch src/index.ts`, unchanged.

`typecheck` (`tsc --noEmit`) is a separate script, still runs against
`src/` directly, and is unaffected by the bundler swap.

## Worker command

Railway must run the compiled bundle with plain `node`, **not** through
an npm/pnpm script wrapper. This was verified empirically, not assumed:
starting the worker via `pnpm run start` and sending it SIGTERM left the
actual `node dist/index.js` process completely untouched — `pnpm`
(nested through its own two wrapper processes plus an intermediate
`sh -c`) never forwarded the signal to the real process. Starting
`node dist/index.js` directly and sending SIGTERM logged `"Received
SIGTERM, shutting down worker"` and exited cleanly, as `worker.ts`
already expects.

```
node dist/index.js
```

This is what the Dockerfile's `CMD` runs directly (see below) — never
`pnpm worker:web` (that's the *dev* command, `tsx watch`) and never
`pnpm start`/`npm start` (the wrapper-forwarding problem above).

## Build command

```
pnpm install --frozen-lockfile
pnpm --filter @qavio/worker-web build
```

(This is exactly what the Dockerfile's build stage runs — see below.)

## Docker

**A Dockerfile was needed.** Railway's default Nixpacks builder has no
knowledge of Playwright's OS-level Chromium dependencies (fonts, shared
libraries, etc.) — `.github/workflows/ci.yml` already has to install
those explicitly on a full Ubuntu runner (`playwright install
--with-deps chromium`). Nixpacks' generic Node buildpack cannot
replicate that, so a Docker-based build is the only reliable way to get
a correct Playwright runtime.

**Location:** `workers/web/Dockerfile`. Placed under the worker's own
directory (not repo root) because this monorepo has multiple
independently-deployable units (`apps/web`, `apps/api`, and eventually
`workers/ai`/`visual`/`mobile`/`security`) that will each need their own
runtime — a single root Dockerfile would be ambiguous about which one
it builds.

**Approach:** two stages.

1. **`build`** — `node:20-bookworm-slim` (matches this repo's own
   `engines.node: ">=20.0.0"`). Copies the whole repository (pnpm needs
   every workspace `package.json` to resolve the dependency graph — the
   new root `.dockerignore` keeps this from also pulling in
   `node_modules`, `.git`, `dist/`, `.env*`, etc.), runs `pnpm install
   --frozen-lockfile`, then `pnpm --filter @qavio/worker-web build`.
   `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is set here — this stage never
   launches a browser, so there's no reason to download one.
2. **`runtime`** — `mcr.microsoft.com/playwright:v1.56.0-noble`, pinned
   to the exact `playwright` version in `workers/web/package.json`
   (`1.56.0`). This image ships the matching Chromium build plus every
   OS/font dependency it needs already installed — Playwright's own
   compatibility contract is between the npm package version and this
   exact image tag, so both must be bumped together on any future
   Playwright upgrade, never independently. Copies only `workers/web/dist`
   from the build stage (the bundle already contains every `@qavio/*`
   package), then installs `playwright@1.56.0` fresh via `npm install`
   for its Node API — with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so it
   reuses the browser already baked into the image rather than
   re-downloading it. `tini` is installed as an init process (`ENTRYPOINT
   ["tini", "--"]`) so signals reach the worker process directly and
   Chromium's zombie child processes get reaped.

Because the build context must be the repository root (for pnpm
workspace resolution) even though the Dockerfile lives under
`workers/web/`, Railway needs **Root Directory = repo root** and
**Dockerfile Path = `workers/web/Dockerfile`** — not "Root Directory =
`workers/web`".

**Root user, deliberately.** Chromium's own sandbox needs either
additional Linux capabilities (`--cap-add=SYS_ADMIN` or similar) that a
deployed Railway container does not expose, or the `--no-sandbox` launch
flag — which would mean changing `browser-manager.ts`'s already-tested
`chromium.launch()` options solely for this one deployment target. This
repository's own dev sandbox launches Chromium successfully as root
with zero extra flags (verified directly), and running as the official
Playwright image's default (root) is itself the documented default for
that image. The container is the isolation boundary here, not an
in-container non-root user — see the Dockerfile's own comment for the
full reasoning.

## Playwright

- **Installed version:** `1.56.0` (pinned exactly — not a caret range —
  in `workers/web/package.json`, confirmed against `pnpm-lock.yaml`).
- **Chromium installation approach:** the runtime image
  (`mcr.microsoft.com/playwright:v1.56.0-noble`) ships Chromium
  pre-installed at `/ms-playwright`, version-matched to Playwright
  `1.56.0` by Microsoft's own build. The `playwright` npm package
  installed in that stage is told to skip its own browser download
  (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) and use the one already there.
- **Required OS dependencies / fonts:** provided by the base image —
  not manually enumerated in the Dockerfile. This avoids the exact
  maintenance problem CI's own `--with-deps` flag exists to solve
  (apt package lists for Chromium drift over time); the version-matched
  official image sidesteps it entirely.
- **How Chromium was verified:** empirically, twice, in this
  environment — once via the existing test suite (`browser-manager.test.ts`,
  `run-page-check.test.ts`, `playwright-executor.test.ts`: 118 tests, all
  passing, using real Chromium against real local HTTP servers, no
  mocked Playwright objects), and once by bundling a standalone
  launch-a-page-and-read-its-title script through the exact same esbuild
  + `--external:playwright` pipeline the production build uses, run with
  plain `node` (not `tsx`/vitest) — it launched, rendered, and reported
  the title correctly. The Docker image build itself could not be run in
  this sandbox (no Docker daemon, and this sandbox's egress policy blocks
  the container registries a real build would pull from) — see
  "Remaining blockers" below.

## Environment variables

Verified directly from `packages/config/src/env.ts`'s `workerEnvSchema`
and `workers/web/src/index.ts` — not assumed.

**Required** (the worker throws `Invalid environment variables` and
exits immediately if any are missing):

- `REDIS_URL` — same Upstash Redis instance `apps/web`'s BullMQ producer
  already uses. Do not create a second Redis instance.
- `SUPABASE_URL` — the worker's own server-side Supabase URL. Distinct
  from `NEXT_PUBLIC_SUPABASE_URL` (which `workers/*` never reads — see
  `workerEnvSchema`'s own doc comment: "Workers never see NEXT_PUBLIC_*
  variables"), but the *same project*. **This was missing from
  `.env.example`/`docs/environment-variables.md` before this change** —
  fixed as part of this task, since it's a real, code-verified
  requirement.
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; server/worker-only, must
  never reach a `NEXT_PUBLIC_*` variable or the browser.

**Optional** (have defaults in the schema):

- `WORKER_CONCURRENCY` — default `2`. **Set to `1` for the first Railway
  deployment** (see "Worker concurrency" below).
- `TEST_RUN_TIMEOUT_MS` — default `300000` (5 minutes).
- `PLAYWRIGHT_LOCAL_TEST_TARGET_ALLOWLIST` — default `''`. **Must stay
  unset on Railway** — see its own doc comment in
  `packages/config/src/env.ts`; it exists solely to let the engine be
  pointed at `apps/qa-fixture` on `localhost` during local development,
  which every real deployment correctly refuses to do otherwise.

**Explicitly not needed, verified from the code:**

- `SUPABASE_DB_URL` — grepped `workers/web/src` and
  `packages/config/src/env.ts`: zero references. The worker only ever
  uses `@supabase/supabase-js` (`createSupabaseAdminClient`, `SUPABASE_URL`
  + `SUPABASE_SERVICE_ROLE_KEY`), never a direct Postgres connection. Only
  `apps/web`/migration scripts use `SUPABASE_DB_URL`.
- `PLAYWRIGHT_HEADLESS` / `PLAYWRIGHT_NAVIGATION_TIMEOUT_MS` /
  `PLAYWRIGHT_MAX_PAGES` / `PLAYWRIGHT_MAX_DEPTH` — none of these exist
  as env-var-driven settings today, and none were added. `headless`
  defaults to `true` unconditionally (`playwright-executor.ts`, never
  overridden by `index.ts`) — there is no display to render to on a
  worker, so there is nothing to toggle. Navigation timeout, max pages,
  and max depth are already configurable — but per **Test Run**, via
  `test_runs.configuration` (see `readCrawlLimits` in
  `playwright-executor.ts` and docs/playwright-qa-engine.md's crawler
  section), a deliberate Phase 7 design choice so different runs can use
  different limits. Adding global env vars for the same thing would
  duplicate an already-implemented, more granular mechanism — so none
  were added, per this task's own "only introduce configuration that has
  a real implementation purpose."

## Worker concurrency

Set `WORKER_CONCURRENCY=1` for the initial Railway deployment. The
schema's own default (`2`) is left unchanged (it's also what local
development and any future lighter-weight worker would reasonably use)
— the override belongs in Railway's own environment variables for this
specific service, not in code. Do not raise it until real memory/CPU
usage under load on the actual Railway plan is known — Chromium is
dramatically heavier per concurrent job than Phase 6's deterministic
placeholder ever was.

## Graceful shutdown

Unchanged from Phase 6/7 — this task did not touch `worker.ts`'s
shutdown logic, only made sure Railway can actually deliver the signal
to it (see "Worker command" above):

1. Railway sends `SIGTERM` on stop/redeploy.
2. `tini` (PID 1 inside the container) forwards it directly to the
   `node dist/index.js` process — no shell in between to swallow it.
3. `worker.ts`'s existing handler logs it and calls `worker.close()`.
4. BullMQ's `Worker.close()` stops accepting new jobs and waits for any
   currently-active job to finish before resolving.
5. A currently-executing `PlaywrightTestExecutor` run's
   `withBrowserContext` (`browser-manager.ts`) closes its context and
   browser in a `finally` block regardless of how that job's own promise
   settles — so an in-flight crawl's Chromium process is never orphaned
   by a Railway redeploy.
6. `process.exit(0)` once `worker.close()` resolves.

No corrupted Test Run is left behind by an orderly stop: the run stays
in whatever state it was in when it started shutting down (`running`),
and the existing cancellation-poll mechanism
(docs/test-run-engine.md#cancellation) is what already handles a run
that needs to be actively stopped mid-flight — unrelated to, and
unchanged by, this deployment work.

## Health / public networking

**No HTTP endpoint was added, and no Railway public domain should be
configured.** The worker is a pure BullMQ consumer with no inbound
requests of any kind — `worker.on('completed'/'failed'/'error', ...)`
are its only externally-observable signals today, and they're log lines,
not an API. Railway's own container-alive monitoring and restart policy
(a crashed or OOM-killed process gets restarted) is sufficient for a
background worker; a public domain would only add an unauthenticated
network surface with nothing behind it worth exposing. If a health
endpoint is wanted later, the smallest safe addition would be a bare
`http.createServer` bound to `process.env.PORT` responding `200` on
`/healthz` with no other routes and no data — but that is not required
by anything the worker does today, so it was not added.

## Security posture

- No BullMQ job-control API, no way for an external caller to enqueue
  or inspect jobs directly against this service — the only inbound
  channel is Redis itself (`apps/web`'s existing `enqueueTestRun`), and
  Redis credentials live only in `REDIS_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` is read once at process start
  (`createEnv`) and used only server-side to construct the admin
  Supabase client — never logged, never included in any BullMQ job
  payload (`packages/queue/src/job-payload.ts` carries only IDs, by
  design — see its own doc comment), never returned in any response
  (there is no response channel to return it in).
- The structured logger (`workers/web/src/logger.ts`) logs job
  IDs/statuses/error messages, never full env values or request bodies.
- Target-URL SSRF protection (docs/playwright-qa-engine.md) is
  unchanged by this deployment work and applies identically on Railway.

## Verification performed

- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
  — run at the repo root via turbo. All packages pass except
  `@qavio/web`'s own `build`, which fails only on missing
  `NEXT_PUBLIC_*` values in this sandbox (confirmed pre-existing and
  unrelated: building `apps/web` with dummy values for those three
  variables succeeds cleanly, 21/21 pages). `@qavio/worker-web` itself —
  lint, typecheck, 118 tests, and the new esbuild build — all passed.
- Built the worker with the real `build` script, then started the real
  bundle with `node dist/index.js` (real local Redis, dummy Supabase
  values just to get past env validation) — it started, stayed running,
  and shut down cleanly on `SIGTERM` with the expected log line.
- Separately confirmed `pnpm run start`/`npm run start` does **not**
  forward `SIGTERM` to the actual process (see "Worker command") —
  this is exactly why the Dockerfile's `CMD` invokes `node` directly.
- Bundled and ran a standalone Chromium launch (through the identical
  esbuild + `--external:playwright` pipeline) — it launched headless
  Chromium, rendered content, and read back the page title correctly.

## Remaining blockers before first deployment

1. **The Docker image itself has not been built.** This sandbox has no
   Docker daemon and its egress policy blocks the registries
   (`mcr.microsoft.com`, Docker Hub) a real build would pull from — both
   confirmed directly, not assumed. The Dockerfile is correct by
   inspection and every piece it depends on (the bundle, `node
   dist/index.js`, Chromium launching via the exact same bundling
   approach) has been verified independently, but the full `docker build`
   has not been run end-to-end anywhere.
2. **No Railway service exists yet.** Per this task's own instructions,
   nothing was configured or deployed through the Railway connector —
   see "Railway service configuration" in the final report for exactly
   what to set up manually.
3. **Real credentials were never used.** Every local verification above
   used a real local Redis and dummy/placeholder Supabase values, on
   purpose — this task explicitly forbids printing or otherwise handling
   real secret values.
4. **No real BullMQ job has been processed on Railway.** Per this task's
   own closing instruction: production readiness should not be claimed
   until the worker has been deployed to Railway and has actually
   processed a real job end to end.
