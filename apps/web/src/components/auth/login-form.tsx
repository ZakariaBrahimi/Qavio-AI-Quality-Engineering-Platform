'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Input, Label, toast } from '@qavio/ui';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { loginSchema, type LoginValues } from '@/lib/auth-schemas';

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async () => {
    // Authentication isn't wired up to Supabase yet — see docs/architecture.md.
    toast.info('Sign in is not connected yet. This form validates, but does not authenticate.');
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your account to continue.
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
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password ? (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="remember-me" />
        <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground">
          Remember me
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Sign in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
