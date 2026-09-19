# Test Run Engine (Phase 6)

The real, end-to-end Test Run job pipeline:

```
Qavio Web  →  Supabase (test_runs row)  →  BullMQ  →  Redis  →  Web Worker  →  Supabase (status + results)
```

This phase does **not** implement the real Playwright QA engine (crawling,
assertions, visual/responsive/security checks) — that's Phase 7, and no
Playwright is used anywhere in this phase's execution path. What it does
implement is the reliable execution *pipeline* Phase 7 will plug into: a
real `test_runs` row gets created, queued, picked up by a separate worker
process, and driven through its lifecycle with retries, timeouts,
cancellation, and idempotency all handled — currently executing a
deterministic, configurable-duration placeholder check
(`PlaceholderTestExecutor`), not a full QA engine.

## Redis

One environment variable everywhere: `REDIS_URL` (a full connection
string, e.g. `redis://localhost:6379` or `rediss://user:pass@host:port`
for a managed instance with TLS).

It's validated by **two separate, narrow** Zod schemas — see
`packages/config/src/env.ts` — rather than folded into the general-purpose
`serverEnvSchema`/`workerEnvSchema` split that already existed:

- **`queueEnvSchema`** — `apps/web`'s BullMQ *producer* only
  (`apps/web/src/lib/queue.ts`, called from `createTestRun`). Most of
  `apps/web` (auth, projects, team management, …) never touches Redis, so
  requiring it broadly would make unrelated server actions fail
  validation for infrastructure they don't use.
- **`workerEnvSchema`** — every `workers/*` process (the BullMQ
  *consumer*). Workers genuinely need it to do anything at all, so it's
  required unconditionally there.

Local dev: `docker compose up -d redis` (from the `docker-compose.yml` at
the repo root) or `docker run -p 6379:6379 redis:7-alpine`. Production:
point `REDIS_URL` at a managed Redis instance (Upstash, Redis Cloud,
ElastiCache, …) — see **Production deployment** below.

Verifying connectivity without printing the secret:

```bash
node -e "
const { Queue } = require('bullmq');
const q = new Queue('test-runs', { connection: { url: process.env.REDIS_URL } });
q.client.then(() => { console.log('Connected'); process.exit(0); })
 .catch((e) => { console.error('Failed:', e.message); process.exit(1); });
"
```

## BullMQ architecture — `packages/queue`

`packages/queue` is the **only** place either side imports `bullmq`
from directly — "do not scatter BullMQ logic throughout the application."

| Export                    | What it does                                                                 |
| -------------------------- | ------------------------------------------------------------------------------ |
| `TEST_RUN_QUEUE_NAME`      | `'test-runs'` — the one queue name both producer and consumer import          |
| `testRunJobPayloadSchema` / `TestRunJobPayload` | Zod schema + type for what's enqueued                    |
| `createTestRunQueue` / `enqueueTestRun` | Producer: builds a `Queue`, validates + enqueues one job         |
| `createTestRunWorker` / `withPayloadValidation` | Consumer: builds a `Worker`, validates the payload before handing it to the caller's processor |
| `TestExecutor` / `TestExecutionContext` / `TestExecutionResult` | The abstraction a worker calls to actually run a test — see **TestExecutor abstraction** below |

`apps/web/src/lib/queue.ts` is the only consumer of the producer side;
`workers/web/src/worker.ts` is the only consumer of the consumer side.

### Job payload

Deliberately minimal identifiers only:

```ts
{ testRunId, organizationId, projectId, environmentId, type }
```

No `baseUrl`, no configuration, no credentials. The worker loads the full
`test_runs` row (and, separately, the environment's `base_url`) from
Postgres by id instead of trusting a payload that could go stale between
enqueue and execution — **the database remains the source of truth for
test-run state; Redis/BullMQ is only the execution mechanism.** Where a
future executor needs a secret (an API key, a login credential), it should
be resolved server-side by id (`get_credential_secret()`, see
`docs/database.md`) — never put directly into the queue payload.

## State machine — `packages/types`

One authoritative map, `TEST_RUN_TRANSITIONS` (in
`packages/types/src/test-run.ts`), used by both the control plane
(`apps/web`'s `createTestRun`/`cancelTestRun`) and the execution plane
(`workers/web`'s `repository.transitionTestRun`) — neither can write a
status the other would consider illegal, and neither hand-rolls its own
transition logic.

```
created → queued → starting → running → completed
                                       ↘ analyzing → completed   (future AI pass, unused today)
any non-terminal status → failed
any non-terminal status except `created` → cancelled
completed / failed / cancelled: terminal, no outgoing transitions
```

`canTransitionTestRunStatus(from, to)` checks; `assertTestRunTransition`
throws `InvalidTestRunTransitionError` on an illegal one instead of
silently no-opting.

## Worker structure — `workers/web`

```
workers/web/src/
├── index.ts                        Entrypoint: env, admin client, executor, worker, signal handlers
├── worker.ts                       Orchestration (processTestRunJob) + BullMQ wiring (createTestRunWorker)
├── repository.ts                   All test_runs/test_run_jobs/test_results/environments reads & writes
├── logger.ts                       Structured JSON logging
└── executors/placeholder-executor.ts   Phase 6's deterministic stand-in for the real QA engine
```

(`checks/basic-page-check.ts`, a Phase 1 Playwright-based check, still exists but is not called by Phase 6's executor — see **TestExecutor abstraction** below.)

`processTestRunJob` (exported separately from `createTestRunWorker` so it's
unit-testable without a real Redis connection) does, per job:

1. Load the `test_runs` row. Missing → drop the job, don't retry (it will
   never exist). Payload's `projectId`/`environmentId` mismatched against
   the row → drop, don't retry (a stale/corrupt payload, not a transient
   failure).
2. Already terminal (`completed`/`failed`/`cancelled`) → no-op and return
   (idempotent — handles a late retry of an already-finished run, or one
   cancelled while queued).
3. Upsert a `test_run_jobs` row (`status: 'active'`).
4. Advance `queued → starting → running` (tolerating a retry that's
   already `running` — no re-transition attempted).
5. Call `executor.execute(context)`, raced against `TEST_RUN_TIMEOUT_MS`.
6. Write results (idempotent delete-then-insert), re-check the row hasn't
   been finalized concurrently (e.g. cancelled mid-run) before writing the
   final status, then transition to `completed`/`failed`.
7. On a thrown exception: upsert the job record as `failed`; on the
   **final** BullMQ attempt only, also transition the run to `failed` and
   rethrow (so BullMQ's own bookkeeping — `attemptsMade`, the `failed`
   event — stays in sync); on a non-final attempt, rethrow without
   touching `test_runs.status` (it stays `running`) so BullMQ's retry
   re-enters this same flow.

## TestExecutor abstraction

```ts
interface TestExecutor {
  execute(context: TestExecutionContext): Promise<TestExecutionResult>;
}
```

`worker.ts`'s orchestration never talks to Playwright (or anything else)
directly — it calls `executor.execute(...)`. Phase 6 wires a
`PlaceholderTestExecutor`: no browser, no Playwright — it simulates work
for a configurable duration (`test_runs.configuration.durationMs`,
default 250ms), checking `context.signal` between steps so cancellation
actually interrupts it, then reports success. A test-only
`configuration.forceFailure: true` (read from the same server-validated
`configuration` column every other run setting comes from — never a
client-supplied header or query param) makes it report a deterministic
failure instead, for exercising the failure/retry paths without relying
on network flakiness. Phase 7 will add a `PlaywrightTestExecutor`
implementing the same interface. The orchestration code does not change
when that lands — only `index.ts`'s executor wiring does.

## Retry strategy

3 attempts total (1 original + 2 retries), exponential backoff starting at
5s (`packages/queue/src/producer.ts`'s `DEFAULT_JOB_OPTIONS`). A retry
re-enters `processTestRunJob` from the top; because `test_runs.status`
stays `running` across retries (only a *final* failed attempt moves it to
`failed`), and because `test_results`/`test_run_jobs` writes are
idempotent (see below), a retry can never produce duplicate database
records or leave the run stuck.

## Concurrency

`WORKER_CONCURRENCY` (default `2`) caps how many jobs one worker process
runs at once, passed straight to BullMQ's `Worker` `concurrency` option.
Never assumes unlimited parallel browser execution — scale by running more
worker *processes* (each independently configurable), not by raising this
without bound on one.

## Timeouts

`TEST_RUN_TIMEOUT_MS` (default `300000`, 5 minutes) — `worker.ts`'s
`executeWithTimeout` races the executor against this, using an
`AbortController` whose signal is passed into the executor *and* a
promise that rejects once the timeout elapses. Both fire on timeout, so a
badly-behaved executor that never checks `signal.aborted` still can't run
forever — the race's own rejection wins regardless.

## Cancellation

- **Queued, not yet picked up by a worker:** `cancelTestRun` (`apps/web`)
  actually removes the BullMQ job (`removeQueuedTestRunJob`, only while
  its state is `waiting`/`delayed`) so it never gets a chance to run, and
  flips `test_runs.status` to `cancelled`.
- **Already running:** `cancelTestRun` flips the database status. Nothing
  else pushes that change into the already-running job directly, so
  `worker.ts`'s `executeWithTimeout` polls `test_runs.status` every
  `CANCELLATION_POLL_MS` (1s) while a job is executing and aborts the
  same `AbortSignal` the executor receives as soon as it sees
  `cancelled` — the same signal, and the same abort call, that the hard
  timeout uses. `PlaceholderTestExecutor` checks that signal between each
  simulated-work step (25ms increments) and returns a `failed` result
  promptly once it's aborted, rather than running to completion
  regardless. A non-cooperative executor that ignores the signal still
  can't hang forever: `ABORT_GRACE_MS` (5s) after the abort, the race
  forces a hard failure regardless of what the executor is doing.
  `worker.ts` also re-checks the row's status before writing a final
  `completed`/`failed`, so a cancellation racing the very end of
  execution is never clobbered either way, and the idempotent no-op
  check at the top of `processTestRunJob` means even a worst-case retry
  of an already-cancelled run is a safe no-op, never a resurrection.

## Idempotency

A retry (BullMQ-level, or a crashed-and-resumed worker) must not create
duplicate test runs, results, or artifacts:

- **BullMQ-level dedup:** `jobId` is always the test run's own id
  (`enqueueTestRun`) — adding a job with an id that already exists is a
  no-op, so calling `createTestRun` twice for the same run (a retried
  Server Action, a double click) can't produce two competing jobs.
- **`test_run_jobs`:** one row per `job_id` (unique constraint, see
  `supabase/migrations/20250201001900_test_run_jobs_unique_job_id.sql`),
  upserted on every attempt rather than inserted fresh.
- **`test_results`:** delete-then-insert, scoped to the run, on every
  write — a retry always starts from a clean slate for that run rather
  than appending to whatever a previous attempt already wrote.

## Real-time updates

`test_runs` is in the `supabase_realtime` publication (added in
`supabase/migrations/20250201001800_test_run_queue_infra.sql`). The Test
Run details page (`components/test-runs/test-run-status-panel.tsx`)
subscribes to `postgres_changes` for that one row's id and calls
`router.refresh()` on any update — RLS still applies to Realtime, so a
subscriber only ever receives events for rows they could already `SELECT`.

## Authorization

Every write here is gated twice — an app-level check (UI convenience) and
a Postgres RLS policy (the actual boundary, see `apps/web/src/lib/rbac.ts`'s
own comment on this). QA+ (`manage_test_workflows`) is required to create
or cancel a run, enforced by `can_manage_test_workflows()` on both the
`test_runs` INSERT and UPDATE policies (see
`supabase/migrations/20250201001800_test_run_queue_infra.sql` and
`20250201002000_test_runs_update_policy.sql`) — a rank-based check alone
can't express this, since QA and Developer are peer-ranked but only QA may
run tests. Workers write through the service role, which bypasses RLS
entirely, so none of this affects worker updates.

## Local development

```bash
supabase start                     # Postgres + Auth + Storage
docker compose up -d redis         # Redis, for BullMQ

# Terminal 1
pnpm --filter @qavio/web dev       # http://localhost:3000

# Terminal 2
pnpm worker:web                    # the worker that actually runs Test Runs
```

Without the worker running, a created Test Run sits in `queued` — BullMQ
still has the job, it just has no consumer yet.

## Production deployment

Workers must be independently deployable and scalable from `apps/web` —
**never run test execution (Playwright or otherwise) inside the
Vercel/Next.js request process, today or once Phase 7 adds Playwright.**
`apps/web` only ever enqueues a job and returns; all execution happens in
a separate long-running Node process (`workers/web`), deployed to a
platform that supports that (a container host, a VM, a dedicated worker
service — not a serverless function with a request timeout). That
process needs `REDIS_URL`, `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`,
and optionally `WORKER_CONCURRENCY`/`TEST_RUN_TIMEOUT_MS` (see
`docs/environment-variables.md`). Point `apps/web`'s `REDIS_URL` at the
same Redis instance so producer and consumer share one queue.

## What Phase 6 deliberately does not implement

Playwright entirely (not even a single page-load check), website
crawling, AI test generation, AI failure analysis, visual comparison,
mobile testing, security scanning, AI code fixes — all Phase 7+.
`PlaceholderTestExecutor` proves the pipeline end-to-end with one honest,
deterministic, configurable-duration simulated check; Phase 7 replaces
just that class, not the pipeline around it.

**Phase 7 has since landed** — a real Playwright-based engine
(`PlaywrightTestExecutor`) now runs `web`-platform projects through this
same pipeline unchanged; `mobile`/`api` projects still get
`PlaceholderTestExecutor` (see `RoutingTestExecutor`). See
`docs/playwright-qa-engine.md` for that engine's own architecture,
security model, and local development workflow. AI test generation, AI
failure analysis, visual comparison, mobile testing, security scanning,
and AI code fixes remain out of scope.
