import type { Metadata } from 'next';

import { AuthCardLayout } from '@/components/auth/auth-card-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCardLayout>
      <div className="text-left">
        <ForgotPasswordForm />
      </div>
    </AuthCardLayout>
  );
}
