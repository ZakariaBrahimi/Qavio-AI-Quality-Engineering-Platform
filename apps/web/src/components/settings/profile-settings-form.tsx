'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, toast } from '@qavio/ui';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { updateProfile } from '@/app/(dashboard)/settings/actions';

const schema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100, 'Keep it under 100 characters'),
});
type Values = z.infer<typeof schema>;

export interface ProfileSettingsFormProps {
  fullName: string;
  email: string;
}

export function ProfileSettingsForm({ fullName, email }: ProfileSettingsFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fullName } });

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateProfile(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Profile updated.');
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Full name</Label>
        <Input id="profile-name" aria-invalid={Boolean(errors.fullName)} {...register('fullName')} />
        {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">Changing your email isn&apos;t supported yet.</p>
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
