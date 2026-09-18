# Architecture

Qavio's core loop:

```
Connect → Understand → Test → Detect → Explain → Fix → Verify → Repeat
```

The governing principle behind every architectural decision in this repo:

> **Deterministic tools execute tests. AI reasons about the results.**
> AI never replaces a deterministic tool where the deterministic tool is
> more reliable — Playwright runs the browser, BullMQ manages job state,
> Postgres enforces data integrity. AI is only introduced once there is a
> concrete, deterministic result to reason about (a failure, a diff, a log).

## Three planes

### Control Plane

**Next.js (App Router) + Supabase.** Owns everything a human interacts
with directly: authentication, organizations, projects, environments,
test configuration, triggering test runs, and rendering results, bugs,
integrations, and AI analysis metadata. Lives in `apps/web`, backed by
`packages/database` and the schema in `supabase/migrations`.

### Queue

**Redis + BullMQ.** Owns asynchronous job lifecycle: enqueueing a Test Run,
retries, cancellation, concurrency limits, and job state. The control plane
is a producer; workers are consumers. No test execution logic lives here —
only scheduling and state.

### Execution Plane

**Playwright (today), future: visual diffing, security scanners, mobile
drivers.** Owns actually running checks: browser automation, screenshots,
videos, traces, logs. Each kind of check gets its own worker
(`workers/web`, `workers/visual`, `workers/mobile`, `workers/security`) so
they can be deployed and scaled independently — a spike in web functional
runs should never starve visual or security capacity, and vice versa.

```
apps/web (control plane)
    │  enqueue Test Run job
    ▼
Redis + BullMQ (queue)
    │  job picked up
    ▼
workers/web (execution plane)
    │  Playwright runs the check
    ▼
Supabase Postgres (results, artifacts)
    │
    ▼
apps/web renders results  →  (future) workers/ai analyzes failures → bugs
```

## Why this split

- **Independent scaling.** A Playwright worker is CPU/memory-heavy and
  short-lived per job; the Next.js app is not. Coupling them would force
  one to scale for the other's needs.
- **Deterministic-first.** Test execution and result storage must be
  reproducible and auditable without any AI involvement — AI analysis is
  an additive layer on top of results that already exist, never a
  replacement for producing them.
- **Multi-tenant by construction.** Every tenant-scoped table traces back
  to an `organizations` row (see the initial migration), so Row Level
  Security in Postgres — not application code — is the source of truth for
  "can this user see this row."

## Repository structure

```
qavio/
├── apps/
│   ├── web/            Control plane — Next.js App Router UI + server actions
│   └── api/             Internal service endpoints (health checks today;
│                        webhook receivers / worker callbacks later)
├── workers/
│   ├── web/             Execution plane — BullMQ consumer + Playwright (implemented)
│   ├── ai/              AI failure analysis (Phase 1 placeholder)
│   ├── visual/          Visual QA / screenshot diffing (Phase 1 placeholder)
│   ├── mobile/          Mobile app testing (Phase 1 placeholder)
│   └── security/        Security QA scanning (Phase 1 placeholder)
├── packages/
│   ├── ui/               Design system (Radix UI + Tailwind, shadcn-style)
│   ├── types/            Shared domain types (Project, TestRun, Bug, …)
│   ├── database/         Supabase client factories + generated DB types
│   ├── ai/               AI reasoning layer (Phase 1 placeholder)
│   ├── testing/          Shared Vitest config
│   ├── integrations/     Bug-tracker export clients (Phase 1 placeholder)
│   ├── config/           Shared tsconfig bases + env validation
│   └── eslint-config/    Shared ESLint shareable configs
├── supabase/
│   ├── migrations/       SQL schema + RLS policies
│   ├── functions/        Edge functions (none yet)
│   └── seed/              Local dev seed data
├── docs/                  This documentation
├── scripts/               One-off dev scripts
└── .github/workflows/     CI
```

## Future worker architecture

Each execution-plane worker follows the same shape as `workers/web`:

1. A **queue module** defining the BullMQ queue name and a typed job
   payload (validated with Zod).
2. A **worker module** that consumes jobs at a configurable concurrency
   and delegates to a **check module** that does the actual work
   (Playwright for functional/visual, a scanner client for security, a
   device driver for mobile).
3. Results and artifacts are written back through `@qavio/database`, never
   directly by ad hoc SQL in the worker.

`workers/ai` differs slightly: instead of consuming Test Run jobs, it will
consume _failed Test Result_ events, call into `@qavio/ai`, and write a
`Bug.aiSummary` — keeping the "AI reasons about results a deterministic
tool already produced" rule intact.

## Not in Phase 1

Billing, enterprise SSO, mobile testing, security scanning, visual QA, AI
fix generation, complex third-party integrations, Kubernetes, and
real-device farms are all out of scope for this foundation phase. Their
placeholders exist in the repository structure so later phases don't
require restructuring — but no functionality behind them is implemented or
faked.
