import { QavioLogo } from '@qavio/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CreateOrganizationForm } from '@/components/onboarding/create-organization-form';
import { getUserOrganizations } from '@/lib/organizations';

export const metadata: Metadata = { title: 'Create your organization' };

export default async function OnboardingPage() {
  const organizations = await getUserOrganizations();
  if (organizations.length > 0) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <QavioLogo />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Create your organization</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is your team&apos;s workspace in Qavio — projects, test runs, and members all live
            inside it.
          </p>
        </div>
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
