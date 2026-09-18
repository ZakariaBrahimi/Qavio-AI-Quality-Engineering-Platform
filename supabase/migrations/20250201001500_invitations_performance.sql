-- Performance advisor findings against the invitations table, same
-- categories as 20250201001000_rls_performance.sql /
-- 20250201001100_missing_fk_indexes.sql.
create index idx_invitations_invited_by on invitations (invited_by);

drop policy "admins can create invitations" on invitations;
create policy "admins can create invitations" on invitations
  for insert with check (
    has_organization_role(organization_id, 'admin')
    and invited_by = (select auth.uid())
    and (role <> 'owner' or has_organization_role(organization_id, 'owner'))
  );
