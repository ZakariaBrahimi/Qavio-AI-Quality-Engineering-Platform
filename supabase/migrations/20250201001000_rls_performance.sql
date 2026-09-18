-- Performance fixes surfaced by Supabase's performance advisor against
-- the real project:
--
-- 1. `auth_rls_initplan`: an unwrapped `auth.uid()` inside a USING/WITH
--    CHECK clause gets re-evaluated per row instead of once per query.
--    Wrapping it as `(select auth.uid())` lets Postgres treat it as a
--    stable subquery the planner can evaluate once (see
--    https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
-- 2. `multiple_permissive_policies` on `profiles`: two permissive SELECT
--    policies ("own profile" and "co-members' profiles") both run on
--    every SELECT; merged into one OR'd policy so only one policy is
--    evaluated.
--
-- Behavior is unchanged in both cases — same rows are readable/writable
-- as before, just evaluated more cheaply. Replaces the four policies
-- from 20250201000000_core_schema.sql, the three from
-- 20250201000200_issues.sql, and the one each from
-- 20250201000600_notifications_usage_billing_audit.sql that the advisor
-- flagged (drop + recreate, since policy definitions can't be altered
-- in place).

-- ── profiles ─────────────────────────────────────────────────────────────
drop policy "users can read their own profile" on profiles;
drop policy "users can read co-members' profiles" on profiles;

create policy "users can read their own or co-members' profiles" on profiles
  for select using (
    id = (select auth.uid())
    or exists (
      select 1
      from organization_members mine
      join organization_members theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = profiles.id
    )
  );

drop policy "users can update their own profile" on profiles;
create policy "users can update their own profile" on profiles
  for update using (id = (select auth.uid()));

-- ── issue_comments ───────────────────────────────────────────────────────
drop policy "members can add issue comments" on issue_comments;
create policy "members can add issue comments" on issue_comments
  for insert with check (
    is_organization_member(organization_id) and author_id = (select auth.uid())
  );

drop policy "authors can update their own comments" on issue_comments;
create policy "authors can update their own comments" on issue_comments
  for update using (author_id = (select auth.uid()));

drop policy "authors can delete their own comments" on issue_comments;
create policy "authors can delete their own comments" on issue_comments
  for delete using (author_id = (select auth.uid()));

-- ── notifications ────────────────────────────────────────────────────────
drop policy "users can read their own notifications" on notifications;
create policy "users can read their own notifications" on notifications
  for select using (user_id = (select auth.uid()));

drop policy "users can mark their own notifications read" on notifications;
create policy "users can mark their own notifications read" on notifications
  for update using (user_id = (select auth.uid()));

-- ── audit_logs ───────────────────────────────────────────────────────────
drop policy "members can log their own actions" on audit_logs;
create policy "members can log their own actions" on audit_logs
  for insert with check (is_organization_member(organization_id) and actor_id = (select auth.uid()));
