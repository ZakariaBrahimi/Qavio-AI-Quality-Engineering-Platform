-- Qavio Phase 4: project/environment fields the product spec needs that
-- Phase 2's schema didn't yet model — a project description, and
-- archiving + per-environment configuration + a default environment.
--
-- Deliberately not a new RLS policy anywhere in this file: archiving is
-- just an UPDATE (already covered by "admins can update projects" /
-- "developers can update environments"), and hard delete already exists
-- ("owners can delete projects" / "admins can delete environments") —
-- see docs/database.md. Only the shape of the rows changes here.

alter table projects add column description text;
alter table projects add column archived_at timestamptz;

-- Environment-specific settings (custom headers, viewport, feature
-- flags, ...) — genuinely dynamic, so JSONB, same rule as every other
-- JSONB column in this schema. Constrained to a plain object: this is a
-- key/value settings bag, not a place for arbitrary JSON shapes.
alter table environments add column configuration jsonb not null default '{}'
  check (jsonb_typeof(configuration) = 'object');
alter table environments add column archived_at timestamptz;
alter table environments add column is_default boolean not null default false;

-- At most one default environment per project. Partial (not a plain
-- unique constraint on (project_id, is_default)) because most rows have
-- is_default = false and none of those should conflict with each other.
create unique index idx_environments_default_per_project on environments (project_id)
  where is_default;

-- Atomically moves the "default" flag from whichever environment has it
-- to `p_environment_id`, within one round trip. Deliberately NOT
-- security definer: both updates below run as the calling user, so
-- they're still bound by the existing "developers can update
-- environments" RLS policy exactly as if the app had issued them
-- separately — this function exists for atomicity (no window where a
-- project has zero defaults), not to grant anything RLS wouldn't.
create or replace function set_default_environment(p_environment_id uuid)
returns environments
language plpgsql
security invoker
set search_path = public
as $$
declare
  target environments;
begin
  select * into target from environments where id = p_environment_id;

  if target is null then
    raise exception 'Environment not found';
  end if;

  update environments set is_default = false
  where project_id = target.project_id and is_default = true and id <> target.id;

  update environments set is_default = true
  where id = target.id
  returning * into target;

  return target;
end;
$$;

-- Not a privilege gap this time (the function is security invoker and
-- fully RLS-bound either way), but revoking anon explicitly keeps the
-- security advisor quiet and signals intent, matching every other
-- function in this schema — see the Phase 3 lock-down migrations for
-- why relying on "revoke ... from public" alone isn't enough on its own.
revoke execute on function set_default_environment(uuid) from public, anon;
grant execute on function set_default_environment(uuid) to authenticated;
