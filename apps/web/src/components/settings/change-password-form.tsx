'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, toast } from '@qavio/ui';
import { useForm } from 'react-hook-form';

import { updatePassword } from '@/app/(auth)/actions';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/auth-schemas';

/** Reuses the same `updatePassword` action and schema as the password-reset flow — it only requires an authenticated session, not a recovery link, so it works here too. */
export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    const result = await updatePassword(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Password updated.');
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-new-password">Confirm new password</Label>
        <Input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
