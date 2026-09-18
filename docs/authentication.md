# Authentication, Organizations & RBAC

Phase 3. Builds on the schema in `docs/database.md` — read that first for
the multi-tenant model, roles, and RLS. This document covers how
`apps/web` actually uses Supabase Auth: sessions, the signup → create-org
flow, organization switching, and how permission checks are centralized
without ever trusting the client.

## Session management

`@supabase/ssr` backs every Supabase client `apps/web` creates, all under
`src/lib/supabase/`:

- `browser.ts` — a single reused client for `"use client"` components.
- `server.ts` — for Server Components/Actions/Route Handlers; reads
  cookies via `next/headers`. Writing cookies from a Server Component
  throws in Next.js, so `setAll` is wrapped in a try/catch there — safe,
  because `middleware.ts` refreshes the session cookie on every request
  regardless, so a Server Component seeing a slightly stale cookie never
  widens what the user can do.
- `middleware.ts` (the lib file) — the request/response cookie adapter
  `middleware.ts` (the root one) uses to call `supabase.auth.getUser()`
  on every request. `getUser()`, not `getSession()` — only `getUser()`
  actually revalidates the token against Supabase; `getSession()` just
  reads the cookie and can hand back an expired session.
- `admin.ts` — the service-role client. Used in exactly one place today:
  `auth.admin.inviteUserByEmail()` for team invites (see below). Never
  imported by anything that reaches the browser, and never used to read
  or write tenant data RLS should be gating.

`apps/web/middleware.ts` runs on every request (matcher excludes static
assets), refreshes the session, and:

- Redirects an unauthenticated request to `/login?next=<path>` unless
  the path is a public auth page (`/login`, `/signup`,
  `/forgot-password`, `/check-email`) or always-allowed
  (`/auth/*`, `/invite/*`, `/reset-password`).
- Redirects an authenticated request away from a public auth page to
  `/overview`.
- Leaves `/onboarding` alone in both directions: it requires a session
  (not "public"), but is never treated as an auth page to redirect a
  signed-in user away from — it's exactly where a signed-in user with
  zero organizations belongs.

The `(dashboard)/layout.tsx` Server Component adds the one check
middleware can't cheaply do on every request: it fetches the user's
organizations and redirects to `/onboarding` if there are none.

## Email flows: one callback route

Signup confirmation, password recovery, and invite acceptance all use
Supabase's PKCE flow — an email link with a `code`, pointing at
`app/auth/callback/route.ts`, which exchanges the code for a session and
redirects to whatever `?next=` was set:

- Signup: `emailRedirectTo` is `/auth/callback?next=/onboarding` (or
  `/invite/<token>` when signing up from an invite link — see
  `signUp()`'s second argument in `(auth)/actions.ts`).
- Password reset: `/auth/callback?next=/reset-password`.
- Invite email (sent via `auth.admin.inviteUserByEmail`):
  `/auth/callback?next=/invite/<token>`.

A code that fails to exchange (expired/already used) redirects to
`/login?error=link_expired`, which `LoginForm` reads and shows as an
alert.

**Operational note**: this only works once the deployed app's origin
(e.g. `https://your-app.example.com/auth/callback`) is added to the
Supabase project's Auth → URL Configuration → Redirect URLs allow list.
That's a dashboard setting, not something any migration or MCP tool
here can set — do it by hand per environment.

## Signup → create organization → dashboard

```
Sign Up → Check your email → (click link) → /onboarding → Create org → /overview
```

`/onboarding` collects exactly one field: an organization name. The slug
is derived from it (`slugify()` + a random 4-character suffix, so two
people naming their org "Acme" don't collide) — no separate slug/company-size/
industry questions, per the "don't add unnecessary onboarding questions"
rule. The action calls `create_organization()` (see `docs/database.md`),
then sets `qavio_org_id` (see below) to the new org and redirects to
`/overview`.

## Current organization

A user can belong to multiple organizations, so "current organization"
is request-scoped state, not a fact about the user. `src/lib/organizations.ts`:

- `getUserOrganizations()` — every membership, via two RLS-scoped
  queries (`organization_members` then `organizations`) rather than a
  Supabase nested-select, to avoid depending on how supabase-js infers
  embedded-resource shapes for a to-one relationship without a unique
  constraint on the FK column.
- `resolveCurrentOrganization(memberships, cookieOrgId)` — pure function,
  the actual "which org" decision. **Never trusts `cookieOrgId` at face
  value**: it only returns a membership that's actually in the caller's
  own (RLS-scoped) `memberships` list, falling back to the first one for
  anything else — a stale, forged, or someone-else's org id in the
  cookie just falls back silently instead of ever being used.
- `getCurrentOrganization()` — combines both for the common case.

Switching organizations (`app/actions/organizations.ts`,
`switchOrganization(organizationId)`) doesn't just trust the id the
client passes either: it re-queries `organization_members` filtered to
that exact id, which — because the SELECT policy is
`is_organization_member(organization_id)` — returns a row only if the
caller genuinely belongs to that org. Only then does it set the cookie.
This is the same "never trust a client-supplied organization id" rule
applied to the one place in the app where the client explicitly asks to
change context.

The `qavio_org_id` cookie itself is not `httpOnly` (nothing sensitive
depends on its value alone — every read of it is re-verified as above)
and skips `secure` outside production, so it still works over plain
`http://localhost` in local dev.

## RBAC

`src/lib/rbac.ts` centralizes permission checks — but it is **UI
convenience only**. It decides what to render (show/hide an "Invite"
button, disable a role option); it is never the actual authorization
boundary. Getting it wrong would produce a confusing UI, never a
security hole, because every mutation it gates is independently
enforced by Postgres RLS (`docs/database.md`).

```
OWNER > ADMIN > { QA, DEVELOPER } > VIEWER
```

Mirrors `organization_role_rank()` in the database exactly. Most
permissions are a rank threshold (`manage_organization`/`manage_members`
→ admin+, `manage_issues` → developer+, `view_results` → everyone). One
isn't: QA and Developer share a rank, but only QA (and admin/owner above
it) gets `manage_test_workflows` — Developer's conceptual permission is
"view results and work issues," not "run tests," so that one permission
is a role *set*, not a rank comparison. `hasPermission(role, permission)`
handles both without the caller needing to know which.

Every Server Action that changes membership or roles re-derives the
caller's role from `getCurrentOrganization()` and re-checks
`hasPermission(...)` itself — see `(dashboard)/team/actions.ts`. That
check is redundant with what RLS would do anyway; it exists purely to
turn a would-be raw Postgres RLS-violation error into a clear message,
never as a substitute for the database check.

## Team management & invitations

`/team` (admin+ to invite/change-role/remove; everyone can view) reads
real data — no fake member counts or placeholder rows. Inviting someone:

1. `inviteMember()` re-checks `manage_members`, and separately that only
   an owner can invite an `owner` (mirroring the DB guardrail — see
   `docs/database.md`'s "Invitations").
2. Inserts a real `invitations` row. A second pending invite for the
   same `(org, email)` is rejected with a friendly message (backed by a
   partial unique index, not just application logic).
3. Calls `auth.admin.inviteUserByEmail()` (service role) to actually
   send Supabase's invite email. If that fails because the invitee
   already has an account (the common case — Supabase won't send an
   "invite" email to an existing user), the action hands back a
   shareable link instead of reporting failure: the invitation row is
   still real and still acceptable, just not delivered by email.

Change-role and remove both use `ConfirmDialog` for the destructive
path, disable themselves in the UI for a transition the current actor
can't make (touching an owner row without being one, or removing the
organization's last owner), and still rely on the database to actually
enforce it.

`/invite/[token]` (works for signed-out visitors) previews the
invitation via `get_invitation_preview()`, then branches on: no
invitation found, already accepted/revoked/expired, not signed in (CTA
to sign up — pre-filling the invited email — or sign in, both carrying
`next=/invite/<token>`), signed in as the wrong email (offers to sign out
and use a different account), or signed in as the right one (an Accept
button calling `accept_invitation()`).

## What's out of scope here

Deleting an organization (no RLS delete policy exists for
`organizations` — adding one is a deliberate future decision, not an
oversight); the Test Run execution engine (explicitly deferred, see
`docs/architecture.md`); email templates and the Auth redirect-URL allow
list (Supabase project dashboard settings, not code in this repository).
