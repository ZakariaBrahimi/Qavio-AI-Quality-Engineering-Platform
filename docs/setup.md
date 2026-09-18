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

# Redis, for BullMQ
docker run -p 6379:6379 redis:7-alpine
```

## Running things

```bash
# Web app (http://localhost:3000)
pnpm --filter @qavio/web dev

# Internal API (http://localhost:4000)
pnpm --filter @qavio/api dev

# Web functional QA worker
pnpm --filter @qavio/worker-web dev

# Everything Turborepo knows how to run in dev mode
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
