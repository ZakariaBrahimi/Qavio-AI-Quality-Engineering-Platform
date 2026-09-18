# Testing

Phase 1 sets up the infrastructure for unit, integration, and future E2E
tests — it does not build the full QA engine. Every workspace that has
runtime logic worth testing has a `test` script and at least one real test
proving the setup works.

## Unit / integration tests — Vitest

Every package/app that needs tests depends on `@qavio/testing`, which
exports `baseVitestConfig` (Node environment, v8 coverage). A workspace's
own `vitest.config.ts` merges that base with what it needs:

```ts
// packages/types/vitest.config.ts
import { mergeConfig } from 'vitest/config';

import { baseVitestConfig } from '@qavio/testing';

export default mergeConfig(baseVitestConfig, {});
```

React packages (`packages/ui`, `apps/web`) additionally set
`environment: 'jsdom'`, add `@vitejs/plugin-react`, and load
`@testing-library/jest-dom` matchers via a `vitest.setup.ts`.

Run tests for one workspace:

```bash
pnpm --filter @qavio/ui test
```

Or everywhere:

```bash
pnpm test
```

## What's covered today

- `packages/types` — status-transition helpers (`isTestRunFinished`)
- `packages/config` — the `createEnv` validator
- `packages/database` — client factories build without a network call
- `packages/ui` — `Button` and `StatusBadge` render and respond to interaction
- `apps/web` — the env schema, the `ComingSoon` placeholder component, and
  (Phase 3) the full authentication/organization/RBAC surface:
  - `lib/rbac.test.ts` — the permission matrix (including that QA and
    Developer, equal rank, still get different capabilities)
  - `lib/organizations.test.ts` — `resolveCurrentOrganization`'s cookie
    fallback logic
  - `(auth)/actions.test.ts` — signUp/signIn/signOut/password-reset
    Server Actions, including that Supabase errors get mapped to safe
    messages
  - `middleware.test.ts` — route protection: unauthenticated → redirect
    to `/login?next=...`, authenticated → through, and the
    `/reset-password`/`/onboarding` special cases
  - `onboarding/actions.test.ts`, `app/actions/organizations.test.ts` —
    organization creation and switching, including rejecting an org the
    caller doesn't belong to
  - `(dashboard)/team/actions.test.ts` — invite/change-role/remove,
    covering the owner-only guardrails and non-admin rejection
  - `invite/[token]/actions.test.ts` — invitation acceptance
  - `components/auth/*.test.tsx` — `LoginForm`/`SignupForm` validation
    and success/error rendering

  Server Actions are tested by mocking `@/lib/supabase/server` (and
  `next/headers` where an action sets a cookie) with a small hand-built
  Supabase client double per test file — see any file under
  `(dashboard)/team/__tests__/` for the pattern. Shared mock objects a
  `vi.mock` factory closes over must go through `vi.hoisted(...)`, not a
  plain `const` — the factory runs before ordinary top-level statements.
- `apps/api` — the `/health` route (via Fastify's `inject()`, no real port)
- `workers/web` — job payload validation, and a real Playwright check
  (`runBasicPageCheck`) against both a page that loads and a URL that
  can't be reached

## Playwright (future E2E)

`workers/web` already depends on Playwright and its tests launch a real
Chromium instance — that is today's foundation for the eventual E2E suite
that will exercise `apps/web` end-to-end. CI installs Chromium with
`playwright install --with-deps chromium` before running tests. A full
E2E suite (multi-page flows, fixtures, visual baselines) is future work,
not this phase.

## What's intentionally not here

`pnpm test` never hits a real Supabase or Redis instance — every Server
Action test mocks the Supabase client instead, so this stays fast and
hermetic in CI. The RLS policies and functions those actions call
through to (organization role guardrails, `accept_invitation()`, the
last-owner trigger) were instead verified once, by hand, against the
real Phase 2/3 Supabase project — see "Real project" in
`docs/database.md` — since `pnpm test` has no way to exercise Postgres
RLS as a specific authenticated role. That verification isn't repeatable
via a script; re-run it by hand after any migration that touches RLS.
