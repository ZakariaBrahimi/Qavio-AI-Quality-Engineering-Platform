import type { Metadata } from 'next';

import { AuthCardLayout } from '@/components/auth/auth-card-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <AuthCardLayout>
      <div className="text-left">
        <ResetPasswordForm />
      </div>
    </AuthCardLayout>
  );
}
