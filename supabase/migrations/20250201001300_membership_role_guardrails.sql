-- Qavio Phase 3: close two privilege-escalation gaps in the
-- organization_members policies from 20250201000000_core_schema.sql.
--
-- Before this migration, "has_organization_role(organization_id,
-- 'admin')" was the *only* check on insert/update/delete — meaning any
-- admin could promote themselves (or anyone) to owner, or demote/remove
-- the actual owner. Neither requires owner rank today. This migration
-- adds: only an owner may create/touch a row that is (or becomes) an
-- owner row, and a trigger that blocks removing an organization's last
-- remaining owner (which would otherwise make it ownerless — and
-- therefore invisible to everyone, the same failure mode
-- create_organization() was written to avoid).

drop policy "admins can manage membership" on organization_members;
create policy "admins can add non-owner members" on organization_members
  for insert with check (
    has_organization_role(organization_id, 'admin')
    and (role <> 'owner' or has_organization_role(organization_id, 'owner'))
  );

drop policy "admins can update membership roles" on organization_members;
create policy "admins can update non-owner membership roles" on organization_members
  for update using (
    has_organization_role(organization_id, 'admin')
    and (role <> 'owner' or has_organization_role(organization_id, 'owner'))
  )
  with check (
    role <> 'owner' or has_organization_role(organization_id, 'owner')
  );

drop policy "admins can remove members" on organization_members;
create policy "admins can remove non-owner members" on organization_members
  for delete using (
    has_organization_role(organization_id, 'admin')
    and (role <> 'owner' or has_organization_role(organization_id, 'owner'))
  );

create or replace function prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from organization_members
      where organization_id = old.organization_id
        and role = 'owner'
        and id <> old.id
    ) then
      raise exception 'Cannot remove the last owner of an organization';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger organization_members_prevent_last_owner_removal
  before update or delete on organization_members
  for each row execute function prevent_last_owner_removal();
