import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignupPage() {
  return (
    <AuthSplitLayout
      headline="Start your free trial"
      subheadline="Create your account and get started in minutes. No credit card required."
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
