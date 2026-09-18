import { Button, QavioLogo } from '@qavio/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AcceptInvitationButton } from '@/components/invite/accept-invitation-button';
import { SwitchAccountButton } from '@/components/invite/switch-account-button';
import { ROLE_LABELS } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Join organization' };

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const [{ data: rows }, user] = await Promise.all([
    supabase.rpc('get_invitation_preview', { p_token: params.token }),
    getCurrentUser(),
  ]);

  const invitation = rows?.[0];
  const isExpired = invitation ? new Date(invitation.expires_at) < new Date() : false;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <QavioLogo />
      </div>
      <div className="w-full max-w-sm text-center">
        {!invitation ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Invitation not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This invitation link doesn&apos;t exist, or the invitation was already removed.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </>
        ) : invitation.status === 'accepted' ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Already accepted</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This invitation to join <strong>{invitation.organization_name}</strong> has already
              been accepted.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/overview">Go to dashboard</Link>
            </Button>
          </>
        ) : invitation.status === 'revoked' ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Invitation revoked</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This invitation to join <strong>{invitation.organization_name}</strong> was revoked.
              Ask an admin there to send a new one.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </>
        ) : invitation.status === 'expired' || isExpired ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Invitation expired</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This invitation to join <strong>{invitation.organization_name}</strong> has expired.
              Ask an admin there to send a new one.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">You&apos;re invited</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join <strong>{invitation.organization_name}</strong> as{' '}
              <strong>{ROLE_LABELS[invitation.role]}</strong>. This invitation was sent to{' '}
              {invitation.email}.
            </p>

            <div className="mt-6 space-y-3">
              {!user ? (
                <>
                  <Button asChild className="w-full">
                    <Link
                      href={`/signup?email=${encodeURIComponent(invitation.email)}&next=${encodeURIComponent(`/invite/${params.token}`)}`}
                    >
                      Create an account
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`}>
                      Sign in
                    </Link>
                  </Button>
                </>
              ) : user.email.toLowerCase() === invitation.email.toLowerCase() ? (
                <AcceptInvitationButton token={params.token} />
              ) : (
                <>
                  <p className="text-sm text-destructive">
                    You&apos;re signed in as {user.email}, but this invitation was sent to{' '}
                    {invitation.email}.
                  </p>
                  <SwitchAccountButton token={params.token} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
