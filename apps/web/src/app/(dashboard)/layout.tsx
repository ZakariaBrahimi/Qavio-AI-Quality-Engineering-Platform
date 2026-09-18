import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { CURRENT_ORG_COOKIE, getUserOrganizations, resolveCurrentOrganization } from '@/lib/organizations';
import { getCurrentUser } from '@/lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();
  if (organizations.length === 0) {
    redirect('/onboarding');
  }

  const currentOrganization = resolveCurrentOrganization(
    organizations,
    cookies().get(CURRENT_ORG_COOKIE)?.value,
  );

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <AppSidebar
          organizations={organizations}
          currentOrganizationId={currentOrganization?.organizationId ?? null}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <AppHeader
          user={{ name: user.fullName ?? user.email, email: user.email }}
          role={currentOrganization?.role}
          organizations={organizations}
          currentOrganizationId={currentOrganization?.organizationId ?? null}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
