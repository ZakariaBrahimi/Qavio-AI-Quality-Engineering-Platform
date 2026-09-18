'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, toast } from '@qavio/ui';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { signupSchema, type SignupValues } from '@/lib/auth-schemas';

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit(async () => {
    toast.info('Sign up is not connected yet. This form validates, but does not create an account.');
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Fill in your details to get started.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="e.g. Jane Smith"
          aria-invalid={Boolean(errors.fullName)}
          {...register('fullName')}
        />
        {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
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

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
