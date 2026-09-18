'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { OrganizationRole } from '@qavio/types';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@qavio/ui';
import { AlertCircle, Copy, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { inviteMember } from '@/app/(dashboard)/team/actions';
import { ROLE_LABELS } from '@/lib/rbac';

export interface InviteMemberDialogProps {
  assignableRoles: OrganizationRole[];
  onInvited?: () => void;
}

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.string().min(1, 'Select a role'),
});
type Values = z.infer<typeof schema>;

export function InviteMemberDialog({ assignableRoles, onInvited }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: assignableRoles.includes('viewer') ? 'viewer' : assignableRoles[0] },
  });

  const role = watch('role');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setInviteLink(null);
    const result = await inviteMember(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    if (result.data.inviteLink) {
      setInviteLink(result.data.inviteLink);
    } else {
      toast.success(`Invitation sent to ${values.email}.`);
      setOpen(false);
      reset();
    }
    onInvited?.();
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
      setFormError(null);
      setInviteLink(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email with a link to join this organization.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                This person already has a Qavio account, so no invite email was sent. Share this
                link with them instead — it will add them to this organization once they open it.
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} className="text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy invite link"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink);
                  toast.success('Link copied.');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                  setInviteLink(null);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                placeholder="teammate@company.com"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(value) => setValue('role', value)}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((assignableRole) => (
                    <SelectItem key={assignableRole} value={assignableRole}>
                      {ROLE_LABELS[assignableRole]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send invitation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
