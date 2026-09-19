# Qavio

**Better Quality. Faster Releases.**

Qavio is an AI Quality Engineering Platform. Teams connect their web,
mobile, and API applications; Qavio understands them, runs functional,
visual, responsive, and security QA, detects bugs, explains them with AI,
suggests and verifies fixes, and reports on quality — in the app and in
CI/CD.

The core loop:

```
Connect → Understand → Test → Detect → Explain → Fix → Verify → Repeat
```

And the rule behind every architectural decision:

> Deterministic tools execute tests. AI reasons about the results.

## This repository, today

Foundation (Phase 1): a monorepo, a design system, an application shell,
a working Playwright-backed worker, and the tooling
(lint/typecheck/test/build/CI) to keep all of it honest. Database (Phase
2): the full multi-tenant Postgres schema and RLS policies, applied to a
real Supabase project. Authentication (Phase 3): real Supabase Auth,
session management, the signup → create-organization flow, an
organization switcher, centralized RBAC, and team invitations — see
`docs/authentication.md`.

The first real product surface — **Web Functional QA** (test
suites/runs/results) — is scaffolded but not yet wired end-to-end; routes
that aren't implemented are clearly marked "coming soon" rather than
faked. See `docs/architecture.md` for the full picture and what's
deliberately out of scope.

## Stack

TypeScript · Next.js (App Router) · React · Tailwind CSS · Radix UI
(shadcn-style) · Zod · React Hook Form · TanStack Query · Supabase
(Postgres + Auth) · Redis · BullMQ · Playwright · Turborepo · pnpm

## Repository structure

```
apps/        web (control plane UI) · api (internal service) · qa-fixture (local-only test app for the QA engine)
workers/     web (Playwright + BullMQ, implemented) · ai/visual/mobile/security (placeholders)
packages/    ui · types · database · ai · testing · integrations · config
supabase/    migrations · functions · seed
docs/        architecture, setup, environment variables, testing, CI, conventions
```

Full breakdown: `docs/architecture.md`.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # see docs/environment-variables.md

pnpm dev      # turborepo dev tasks across the monorepo
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Details, including running Supabase and Redis locally: `docs/setup.md`.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — control plane / queue /
  execution plane, repository structure, future worker architecture
- [`docs/test-run-engine.md`](docs/test-run-engine.md) — the real Test Run
  job pipeline: BullMQ queue, worker orchestration, state machine, retries,
  concurrency, timeouts, cancellation, idempotency
- [`docs/playwright-qa-engine.md`](docs/playwright-qa-engine.md) — the real
  browser-based QA engine: crawling, SSRF protection, functional checks,
  artifacts, local development against `apps/qa-fixture`
- [`docs/database.md`](docs/database.md) — schema, multi-tenant model,
  roles, RLS, credentials/secrets, audit logging
- [`docs/authentication.md`](docs/authentication.md) — Supabase Auth,
  sessions, signup/onboarding, organization switching, RBAC, invitations
- [`docs/setup.md`](docs/setup.md) — local development setup
- [`docs/environment-variables.md`](docs/environment-variables.md) — every
  variable, who consumes it, and why
- [`docs/testing.md`](docs/testing.md) — unit/integration test setup, what's
  covered today
- [`docs/ci.md`](docs/ci.md) — what GitHub Actions runs and why
- [`docs/conventions.md`](docs/conventions.md) — TypeScript, naming,
  structure, and linting conventions

## What's explicitly not here yet

Billing, enterprise SSO, mobile testing, security scanning, visual QA, AI
fix generation, complex third-party integrations, Kubernetes, and
real-device farms. Their places in the repository structure exist so
later phases don't require restructuring — nothing behind them is
implemented or faked.
