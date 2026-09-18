-- Qavio core schema: extensions, roles, and the tenancy backbone
-- (profiles, organizations, organization_members, projects, environments).
--
-- Architecture note: every organization-owned table in this schema (here
-- and in later migrations) carries its own `organization_id` column —
-- even when it could be derived by joining through a parent table (e.g.
-- a test case's organization via its project). This is a deliberate
-- denormalization: it keeps every Row Level Security policy in this
-- schema a single, fast, indexable check
-- (`is_organization_member(organization_id)`) instead of a multi-table
-- join, and it keeps authorization logic centralized in the two helper
-- functions defined below rather than re-implemented per table.

create extension if not exists "pgcrypto";

-- ── roles ────────────────────────────────────────────────────────────────
-- OWNER > ADMIN > {QA, DEVELOPER} > VIEWER. QA and DEVELOPER are peers
-- (see organization_role_rank below) — neither implies the other.
create type organization_role as enum ('owner', 'admin', 'qa', 'developer', 'viewer');

-- ── profiles ─────────────────────────────────────────────────────────────
-- One row per auth.users row. Created automatically by the trigger below
-- so application code never has to remember to create it.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ── organizations ──────────────────────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role organization_role not null default 'viewer',
  invited_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_organization_members_user_id on organization_members (user_id);
create index idx_organization_members_organization_id on organization_members (organization_id);

-- ── centralized authorization helpers ───────────────────────────────────
-- Every RLS policy in this schema goes through one of these two
-- functions — never a hand-rolled join — so the membership/role rule is
-- defined exactly once.

create or replace function is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function organization_role_rank(role organization_role)
returns int
language sql
immutable
as $$
  select case role
    when 'owner' then 4
    when 'admin' then 3
    when 'qa' then 2
    when 'developer' then 2
    when 'viewer' then 1
  end;
$$;

-- True when the caller is a member of the organization with a role whose
-- rank is >= the rank of `min_role` (e.g. has_organization_role(id, 'admin')
-- is true for both 'admin' and 'owner').
create or replace function has_organization_role(target_organization_id uuid, min_role organization_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and organization_role_rank(role) >= organization_role_rank(min_role)
  );
$$;

-- Atomically creates an organization and its first membership (as
-- 'owner') so an organization can never exist without an owner —
-- which would otherwise make it invisible to everyone under RLS.
create or replace function create_organization(org_name text, org_slug text)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org organizations;
begin
  insert into organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning * into new_org;

  insert into organization_members (organization_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

revoke all on function create_organization(text, text) from public;
grant execute on function create_organization(text, text) to authenticated;

-- ── projects ─────────────────────────────────────────────────────────────
create type project_platform as enum ('web', 'mobile', 'api');

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  platform project_platform not null default 'web',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index idx_projects_organization_id on projects (organization_id);

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ── environments ─────────────────────────────────────────────────────────
create type environment_kind as enum ('production', 'staging', 'preview', 'local');

create table environments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  kind environment_kind not null default 'staging',
  base_url text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_environments_organization_id on environments (organization_id);
create index idx_environments_project_id on environments (project_id);

create trigger environments_set_updated_at
  before update on environments
  for each row execute function set_updated_at();

-- ── row level security ───────────────────────────────────────────────────
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table environments enable row level security;

create policy "users can read their own profile" on profiles
  for select using (id = auth.uid());

create policy "users can read co-members' profiles" on profiles
  for select using (
    exists (
      select 1
      from organization_members mine
      join organization_members theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy "users can update their own profile" on profiles
  for update using (id = auth.uid());

create policy "members can read their organization" on organizations
  for select using (is_organization_member(id));

create policy "admins can update their organization" on organizations
  for update using (has_organization_role(id, 'admin'));

create policy "members can read their organization's membership" on organization_members
  for select using (is_organization_member(organization_id));

create policy "admins can manage membership" on organization_members
  for insert with check (has_organization_role(organization_id, 'admin'));

create policy "admins can update membership roles" on organization_members
  for update using (has_organization_role(organization_id, 'admin'));

create policy "admins can remove members" on organization_members
  for delete using (has_organization_role(organization_id, 'admin'));

create policy "members can read their organization's projects" on projects
  for select using (is_organization_member(organization_id));

create policy "admins can create projects" on projects
  for insert with check (has_organization_role(organization_id, 'admin'));

create policy "admins can update projects" on projects
  for update using (has_organization_role(organization_id, 'admin'));

create policy "owners can delete projects" on projects
  for delete using (has_organization_role(organization_id, 'owner'));

create policy "members can read environments" on environments
  for select using (is_organization_member(organization_id));

create policy "developers can manage environments" on environments
  for insert with check (has_organization_role(organization_id, 'developer'));

create policy "developers can update environments" on environments
  for update using (has_organization_role(organization_id, 'developer'));

create policy "admins can delete environments" on environments
  for delete using (has_organization_role(organization_id, 'admin'));
