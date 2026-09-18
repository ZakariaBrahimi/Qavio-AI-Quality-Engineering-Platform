# Coding Conventions

## TypeScript

- `strict: true` everywhere, plus `noUncheckedIndexedAccess`,
  `noUnusedLocals`, and `noUnusedParameters` (see
  `packages/config/tsconfig/base.json`).
- No `any`. No unnecessary `as` casts — if a cast feels necessary, prefer
  narrowing the type at its source (a Zod schema, a type guard) instead.
- Prefer `type` imports (`import type { Foo } from '...'`) for
  type-only symbols — enforced by
  `@typescript-eslint/consistent-type-imports`.

## Structure

- One React component (or one cohesive unit of logic) per file. Split a
  file once it's doing more than one job, not before.
- Domain types live in `packages/types`, one file per domain concept
  (`project.ts`, `test-run.ts`, `bug.ts`, …), re-exported from `index.ts`.
- No hidden global state. Server state goes through Supabase/Postgres;
  client-only UI state stays local to the component or is passed down —
  nothing lives in a module-level mutable singleton.
- Path alias `@/*` inside `apps/web` maps to `apps/web/src/*`. Cross-package
  imports always use the published package name (`@qavio/ui`,
  `@qavio/types`, …), never a relative path across a package boundary.

## Naming

- Files: `kebab-case.ts` / `kebab-case.tsx`.
- React components: `PascalCase` exported as named exports (no default
  exports outside Next.js's required pages/layouts/route handlers).
- Types/interfaces: `PascalCase`. Zod schemas: `camelCaseSchema`.

## Error handling

- Validate at system boundaries (env vars, job payloads, form input) with
  Zod; trust internal function calls to already have valid data.
- Don't add try/catch for errors that can't occur given the types — let
  them throw and be caught at the boundary that actually needs to react
  (a route handler, a worker's job processor).

## Secrets

- Never hardcode a secret or a production URL. Every credential comes
  from an environment variable documented in
  `docs/environment-variables.md`.
- Server-only variables (no `NEXT_PUBLIC_` prefix) must never be imported
  into a `"use client"` module.

## Comments

- Default to no comments. Add one only when it explains a non-obvious
  _why_ (a workaround, an invariant, a constraint) — never to restate what
  the code already says.

## Linting & formatting

- `pnpm lint` / `pnpm lint:fix` — ESLint, shared configs in
  `packages/eslint-config/*.cjs` (`base`, `node`, `react-library`, `next`).
- `pnpm format` — Prettier, with import sorting via
  `@trivago/prettier-plugin-sort-imports` (`node:*` → third-party →
  `@qavio/*` → relative).
- Both run in CI (`pnpm lint` fails the build; run `pnpm format:check`
  locally before pushing if you're unsure).
