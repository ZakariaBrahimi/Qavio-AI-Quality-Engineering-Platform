'use client';

import type { OrganizationRole } from '@qavio/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@qavio/ui';
import { Clock, Mail, RotateCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  changeMemberRole,
  removeMember,
  resendInvitation,
  revokeInvitation,
} from '@/app/(dashboard)/team/actions';
import { InviteMemberDialog } from '@/components/team/invite-member-dialog';
import type { OrganizationMemberRow, PendingInvitationRow } from '@/lib/members';
import { assignableRoles, hasPermission, ROLE_LABELS } from '@/lib/rbac';

export interface TeamViewProps {
  members: OrganizationMemberRow[];
  invitations: PendingInvitationRow[];
  currentRole: OrganizationRole;
  currentUserId: string;
}

function initialsFor(row: OrganizationMemberRow) {
  const source = row.fullName ?? row.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TeamView({ members, invitations, currentRole, currentUserId }: TeamViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<OrganizationMemberRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitationRow | null>(null);

  const canManage = hasPermission(currentRole, 'manage_members');
  const ownerCount = members.filter((member) => member.role === 'owner').length;
  const roleOptionsForInvite = assignableRoles(currentRole);

  function canEditRole(member: OrganizationMemberRow) {
    if (!canManage) return false;
    if (member.role === 'owner' && currentRole !== 'owner') return false;
    return true;
  }

  function canRemove(member: OrganizationMemberRow) {
    if (!canManage) return false;
    if (member.role === 'owner' && currentRole !== 'owner') return false;
    if (member.role === 'owner' && ownerCount <= 1) return false;
    return true;
  }

  function handleRoleChange(member: OrganizationMemberRow, role: string) {
    if (role === member.role) return;
    startTransition(async () => {
      const result = await changeMemberRole({ memberId: member.id, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${member.fullName ?? member.email}'s role is now ${ROLE_LABELS[role as OrganizationRole]}.`);
      router.refresh();
    });
  }

  function handleRemove() {
    if (!removeTarget) return;
    const target = removeTarget;
    startTransition(async () => {
      const result = await removeMember({ memberId: target.id });
      setRemoveTarget(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed ${target.fullName ?? target.email} from the organization.`);
      router.refresh();
    });
  }

  function handleRevoke() {
    if (!revokeTarget) return;
    const target = revokeTarget;
    startTransition(async () => {
      const result = await revokeInvitation({ invitationId: target.id });
      setRevokeTarget(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Revoked the invitation to ${target.email}.`);
      router.refresh();
    });
  }

  function handleResend(invitation: PendingInvitationRow) {
    startTransition(async () => {
      const result = await resendInvitation({ invitationId: invitation.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.inviteLink) {
        void navigator.clipboard.writeText(result.data.inviteLink);
        toast.success('Already has an account — invite link copied instead.');
      } else {
        toast.success(`Invitation resent to ${invitation.email}.`);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Members</h2>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {initialsFor(member)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.fullName ?? member.email}
                          {member.userId === currentUserId ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                          ) : null}
                        </p>
                        {member.fullName ? (
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canEditRole(member) ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) => handleRoleChange(member, role)}
                      >
                        <SelectTrigger className="h-8 w-36" disabled={isPending}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles(currentRole).map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                          {/* The member's current role might be one the current
                              actor can't grant (e.g. an owner viewing another
                              owner they can edit but not requote) — always
                              include it so the trigger has something to show. */}
                          {!assignableRoles(currentRole).includes(member.role) ? (
                            <SelectItem value={member.role}>{ROLE_LABELS[member.role]}</SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {canRemove(member) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${member.fullName ?? member.email}`}
                        disabled={isPending}
                        onClick={() => setRemoveTarget(member)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {canManage ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Pending invitations</h2>
            <InviteMemberDialog assignableRoles={roleOptionsForInvite} onInvited={() => router.refresh()} />
          </div>

          {invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No pending invitations"
              description="Everyone you've invited has already joined, or there's no one waiting."
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="text-sm">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {ROLE_LABELS[invitation.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Resend invitation to ${invitation.email}`}
                            disabled={isPending}
                            onClick={() => handleResend(invitation)}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Revoke invitation to ${invitation.email}`}
                            disabled={isPending}
                            onClick={() => setRevokeTarget(invitation)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove this member?"
        description={`${removeTarget?.fullName ?? removeTarget?.email ?? 'This person'} will lose access to this organization immediately.`}
        confirmLabel="Remove"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke this invitation?"
        description={`${revokeTarget?.email} won't be able to use this invite link anymore.`}
        confirmLabel="Revoke"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
