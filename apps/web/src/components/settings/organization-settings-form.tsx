'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, toast } from '@qavio/ui';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { updateOrganizationName } from '@/app/(dashboard)/settings/actions';

const schema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(80, 'Keep it under 80 characters'),
});
type Values = z.infer<typeof schema>;

export interface OrganizationSettingsFormProps {
  name: string;
  slug: string;
  canEdit: boolean;
}

export function OrganizationSettingsForm({ name, slug, canEdit }: OrganizationSettingsFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name } });

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateOrganizationName(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Organization updated.');
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          disabled={!canEdit}
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-slug">Slug</Label>
        <Input id="org-slug" value={slug} disabled readOnly />
        <p className="text-xs text-muted-foreground">Slugs aren&apos;t editable yet.</p>
      </div>

      {canEdit ? (
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Only admins and owners can rename the organization.</p>
      )}
    </form>
  );
}
