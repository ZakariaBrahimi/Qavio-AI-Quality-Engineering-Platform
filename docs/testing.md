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
- `apps/web` — the env schema, and the `ComingSoon` placeholder component
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

No integration tests hit a real Supabase or Redis instance — that needs
local infrastructure (`docs/setup.md`) and is left for the phase that
implements the real Test Run flow, so this phase's `pnpm test` stays fast
and hermetic in CI.
