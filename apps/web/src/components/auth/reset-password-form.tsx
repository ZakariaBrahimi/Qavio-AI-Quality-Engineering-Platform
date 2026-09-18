'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, toast } from '@qavio/ui';
import { useForm } from 'react-hook-form';

import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/auth-schemas';

export function ResetPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async () => {
    toast.info('Password reset is not connected yet. This form validates, but does not update anything.');
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Set a new password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your new password must be different from your previous password.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter new password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Reset password
      </Button>
    </form>
  );
}
