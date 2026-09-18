import { Button } from '@qavio/ui';
import { MailCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthCardLayout } from '@/components/auth/auth-card-layout';

export const metadata: Metadata = { title: 'Check your email' };

export default function CheckEmailPage() {
  return (
    <AuthCardLayout>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        If an account exists for that address, we&apos;ve sent a password reset link. The link
        will expire in 15 minutes.
      </p>
      <Button asChild className="mt-6 w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </AuthCardLayout>
  );
}
