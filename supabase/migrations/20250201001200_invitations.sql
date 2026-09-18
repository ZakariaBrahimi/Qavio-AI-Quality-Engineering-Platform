-- Qavio Phase 3: organization invitations. An invitation exists whether
-- or not the invited email already has an auth.users row — accepting one
-- is what actually creates the organization_members row, so an org can
-- never gain a member who didn't consent by following the link.

create type invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role organization_role not null default 'viewer',
  invited_by uuid references profiles (id),
  token uuid not null default gen_random_uuid() unique,
  status invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_invitations_organization_id on invitations (organization_id);
create index idx_invitations_email on invitations (email);

-- Only one *pending* invite per (org, email) at a time — re-inviting
-- after a revoke/expiry/accept is fine, that's just a new row.
create unique index idx_invitations_org_email_pending on invitations (organization_id, email)
  where status = 'pending';

alter table invitations enable row level security;

create policy "admins can read their organization's invitations" on invitations
  for select using (has_organization_role(organization_id, 'admin'));

create policy "admins can create invitations" on invitations
  for insert with check (
    has_organization_role(organization_id, 'admin')
    and invited_by = auth.uid()
    and (role <> 'owner' or has_organization_role(organization_id, 'owner'))
  );

create policy "admins can revoke invitations" on invitations
  for update using (has_organization_role(organization_id, 'admin'));

create policy "admins can delete invitations" on invitations
  for delete using (has_organization_role(organization_id, 'admin'));

-- ── invitation lookup by token ──────────────────────────────────────────
-- The invitee doesn't belong to the organization yet, so they can't read
-- the invitations row through the policies above. The token itself is
-- the capability: knowing it is what proves you're the intended
-- recipient, the same way a password-reset link works. This function
-- returns only what an invite-acceptance screen needs to render, for
-- exactly one row, and only while a token is known — it is not a way to
-- browse invitations.
create or replace function get_invitation_preview(p_token uuid)
returns table (
  organization_name text,
  role organization_role,
  email text,
  status invitation_status,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select o.name, i.role, i.email, i.status, i.expires_at
  from invitations i
  join organizations o on o.id = i.organization_id
  where i.token = p_token;
$$;

revoke execute on function get_invitation_preview(uuid) from public;
grant execute on function get_invitation_preview(uuid) to anon, authenticated;

-- ── accepting an invitation ──────────────────────────────────────────────
-- Runs as the invitee (SECURITY DEFINER only to get past the
-- organization_members INSERT policy, which requires admin rank the
-- invitee doesn't have yet). Re-validates everything server-side —
-- token, status, expiry, and that the accepting account's own email
-- matches the invited one — regardless of what the caller claims.
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
    update invitations set status = 'expired' where id = invitation.id;
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
