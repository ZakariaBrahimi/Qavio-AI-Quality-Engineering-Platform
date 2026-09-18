-- Found by manually exercising accept_invitation() against the real
-- project: the `update invitations set status = 'expired' ...` right
-- before `raise exception 'This invitation has expired.'` never
-- actually persists — a RAISE that isn't caught aborts the whole
-- transaction, which rolls back everything the function did earlier in
-- the same call, including that update. The exception itself still
-- correctly blocks the accept every time (expires_at is re-checked on
-- every call), so this was never a security gap — just dead code that
-- looked like it recorded something it never did. Removed rather than
-- worked around: apps/web's getPendingInvitations() now filters on
-- expires_at directly instead of relying on a persisted 'expired' status.
create or replace function accept_invitation(p_token uuid)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation invitations;
  caller_email text;
  org organizations;
begin
  select * into invitation from invitations where token = p_token for update;

  if invitation is null then
    raise exception 'This invitation does not exist.';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'This invitation is no longer pending.';
  end if;

  if invitation.expires_at < now() then
    raise exception 'This invitation has expired.';
  end if;

  select email into caller_email from auth.users where id = auth.uid();

  if caller_email is null or lower(caller_email) <> lower(invitation.email) then
    raise exception 'This invitation was sent to a different email address.';
  end if;

  insert into organization_members (organization_id, user_id, role, invited_by)
  values (invitation.organization_id, auth.uid(), invitation.role, invitation.invited_by)
  on conflict (organization_id, user_id) do nothing;

  update invitations set status = 'accepted', accepted_at = now() where id = invitation.id;

  perform log_audit_event(
    invitation.organization_id,
    'invitation_accepted',
    'invitation',
    invitation.id,
    jsonb_build_object('email', invitation.email, 'role', invitation.role)
  );

  select * into org from organizations where id = invitation.organization_id;
  return org;
end;
$$;

revoke execute on function accept_invitation(uuid) from public, anon;
grant execute on function accept_invitation(uuid) to authenticated;
