# Continuous Integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull
request. A single job, in order:

1. **Install** — `pnpm install --frozen-lockfile`
2. **Install Playwright browsers** — Chromium only, scoped to
   `@qavio/worker-web`, so the Playwright-backed tests can launch a real
   browser
3. **Lint** — `pnpm lint` (Turborepo fans this out to every workspace's
   `eslint . --max-warnings=0`)
4. **Typecheck** — `pnpm typecheck` (`tsc --noEmit` per workspace)
5. **Test** — `pnpm test` (Vitest per workspace)
6. **Build** — `pnpm build` (`next build` for `apps/web`, `tsc` for
   services/workers)

Any failing step fails the workflow — there is no "continue on error" for
quality gates.

## Placeholder environment variables

The build step needs `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` to be _set to something_ for `next build`
to succeed without a real Supabase project. CI sets these as harmless
placeholders at the workflow level (`env:` block) — never a real secret,
and never a server-only variable like `SUPABASE_SERVICE_ROLE_KEY`.

## Turborepo caching

Turborepo's task graph (`turbo.json`) means `lint`/`typecheck`/`test`
depend on `^build` (a workspace's dependencies must build first), so
`packages/*` are always built before the apps and workers that consume
them. Locally this also means re-running `pnpm build` after touching one
package only rebuilds what depends on it.
