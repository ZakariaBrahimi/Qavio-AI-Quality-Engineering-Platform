'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from '@qavio/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/auth-schemas';

export function ForgotPasswordForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async () => {
    // No email backend yet — route to the real "Check your email" state
    // instead of pretending an email was sent.
    router.push('/check-email');
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Forgot your password?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No worries. Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Send reset link
      </Button>

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}
