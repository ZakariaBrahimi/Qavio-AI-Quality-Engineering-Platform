# Development Setup

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 9+ (`corepack enable` will pick up the version pinned in `package.json`)
- Docker (for running Supabase and Redis locally)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) if you want a
  local Postgres instance

## Install

```bash
pnpm install
```

This installs every workspace in `apps/*`, `workers/*`, and `packages/*` in
one pass (pnpm workspaces + Turborepo).

## Environment variables

```bash
cp .env.example .env.local
```

See `docs/environment-variables.md` for what each variable does and who
consumes it. You need at minimum a Supabase project (or `supabase start`
locally) and a Redis instance to run the app with real data — without
them, `apps/web` still runs and renders its placeholder ("coming soon")
routes.

## Local infrastructure

```bash
# Postgres + Auth + Storage, matching supabase/migrations
supabase start

# Redis, for BullMQ — either works:
docker compose up -d redis      # from docker-compose.yml at the repo root
docker run -p 6379:6379 redis:7-alpine
```

`REDIS_URL=redis://localhost:6379` in `.env.local` (apps/web) and `.env`
(workers/web) points both at this container — see
`docs/environment-variables.md` and `docs/test-run-engine.md`.

## Running things

A Test Run needs two processes running at once: the web app (which
enqueues the job) and the worker (which executes it) — see
`docs/test-run-engine.md` for the full pipeline.

```bash
# Terminal 1 — web app (http://localhost:3000)
pnpm --filter @qavio/web dev

# Terminal 2 — the worker that actually runs Test Runs
pnpm worker:web

# Internal API (http://localhost:4000)
pnpm --filter @qavio/api dev

# Everything Turborepo knows how to run in dev mode (web, api, and every
# worker at once, each in the same terminal's interleaved output)
pnpm dev
```

## Common tasks

```bash
pnpm lint        # ESLint across every workspace
pnpm typecheck   # tsc --noEmit across every workspace
pnpm test        # Vitest across every workspace
pnpm build       # Next.js build + tsc builds for services/workers
pnpm format      # Prettier, writes changes
```

Turborepo caches task output per workspace, so re-running any of the above
after a small change only re-runs what's affected.
