import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@qavio/ui';
import type { Metadata } from 'next';

import { OrganizationSettingsForm } from '@/components/settings/organization-settings-form';
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form';
import { getCurrentOrganization } from '@/lib/organizations';
import { ROLE_LABELS, hasPermission } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const [organization, user] = await Promise.all([getCurrentOrganization(), getCurrentUser()]);

  if (!organization || !user) {
    return null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm fullName={user.fullName ?? ''} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            You&apos;re a member of {organization.organizationName} as{' '}
            <span className="font-medium">{ROLE_LABELS[organization.role]}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm
            name={organization.organizationName}
            slug={organization.organizationSlug}
            canEdit={hasPermission(organization.role, 'manage_organization')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
