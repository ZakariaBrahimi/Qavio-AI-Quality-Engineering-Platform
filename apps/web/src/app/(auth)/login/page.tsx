import type { Metadata } from 'next';

import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthSplitLayout
      headline="Better QA. Faster releases."
      subheadline="Automate testing, find bugs, and ship with confidence."
    >
      <LoginForm />
    </AuthSplitLayout>
  );
}
