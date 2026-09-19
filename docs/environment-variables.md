# Environment Variables

Copy `.env.example` to `.env.local` (for `apps/web`) and/or `.env` (for
`apps/api` and `workers/*`), then fill in real values. **Never commit a
filled-in env file** — `.gitignore` already excludes `.env*` except
`.env.example`.

Variables are validated at runtime with Zod schemas defined in
`packages/config/src/env.ts` (`publicEnvSchema`, `serverEnvSchema`,
`workerEnvSchema`). Validation happens lazily, inside a function call
(`createEnv(...)`), not at module import time — so importing a file that
uses these schemas never breaks a build that has no real credentials
configured yet (see `apps/web/src/lib/env.ts` for the pattern).

## Who consumes what

| Variable                                            | Public (browser) | Server (apps/web)        | Workers | Notes                                            |
| --------------------------------------------------- | ---------------- | ------------------------ | ------- | ------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`                               | ✅               | ✅                       |         | Base URL of the web app                          |
| `NEXT_PUBLIC_SUPABASE_URL`                          | ✅               | ✅                       |         | Safe: protected by RLS                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                     | ✅               | ✅                       |         | Safe: protected by RLS                           |
| `SUPABASE_SERVICE_ROLE_KEY`                         | ❌               | ✅                       | ✅      | Bypasses RLS — server/worker only                |
| `SUPABASE_DB_URL`                                   | ❌               | ✅                       |         | Direct Postgres connection (migrations, scripts) |
| `REDIS_URL`                                         | ❌               |                          | ✅      | BullMQ connection — workers/\* only, not apps/web |
| `ANTHROPIC_API_KEY`                                 | ❌               | ✅ (future `workers/ai`) |         | AI provider credential                           |
| `WORKER_CONCURRENCY`                                | ❌               |                          | ✅      | BullMQ worker concurrency                        |
| `PLAYWRIGHT_HEADLESS`                               | ❌               |                          | ✅      | `true`/`false`                                   |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET`             | ❌               | ✅ (future)              |         | Jira OAuth app credentials                       |
| `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET` | ❌               | ✅ (future)              |         | GitHub OAuth app credentials                     |

## Rules

- Any variable exposed to the browser **must** be prefixed with
  `NEXT_PUBLIC_`. Anything without that prefix must never be referenced
  from a `"use client"` component or bundled into client JS.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. Only
  ever pass it to `createSupabaseAdminClient` (`@qavio/database`), and only
  from server-only code.
- CI sets placeholder values for the `NEXT_PUBLIC_*` variables (see
  `.github/workflows/ci.yml`) purely so `pnpm build` succeeds without real
  Supabase credentials. It never sets server secrets.

## The real Phase 2 project

A real Supabase project exists for this phase (ref `bkxkwwocpampseojowxs`,
`eu-west-1`), with every migration in `supabase/migrations` applied and
the same `[DEV]`-labeled seed data as `supabase/seed/seed.sql` (dev login:
`dev@qavio.local` / `devpassword123`). `.env.example` is deliberately left
with generic placeholders rather than this project's values, so a fresh
clone doesn't silently point at somebody else's dev project — copy the
values below into your own `.env.local` if you want to point at it:

```
NEXT_PUBLIC_SUPABASE_URL=https://bkxkwwocpampseojowxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_aM8ilHz6qnjXOKEggAEblw_fspTaoSE
```

Both are safe to expose to the browser (protected by RLS), which is why
they're fine to share this way. `SUPABASE_SERVICE_ROLE_KEY` and
`SUPABASE_DB_URL` are not — they were never generated or stored in this
repository or its chat history; get them from the
[Supabase dashboard](https://supabase.com/dashboard/project/bkxkwwocpampseojowxs/settings/api)
if you need them, and never commit them.
