import { Button, ErrorState } from '@qavio/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthCardLayout } from '@/components/auth/auth-card-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Reset password' };

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <AuthCardLayout>
      {user ? (
        <div className="text-left">
          <ResetPasswordForm />
        </div>
      ) : (
        <ErrorState
          title="Link expired"
          description="That password reset link has expired or was already used."
        >
          <Button asChild className="mt-2 w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </ErrorState>
      )}
    </AuthCardLayout>
  );
}
