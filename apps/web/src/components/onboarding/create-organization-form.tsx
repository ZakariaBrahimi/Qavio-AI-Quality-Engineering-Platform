'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, Button, Input, Label } from '@qavio/ui';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createOrganization } from '@/app/onboarding/actions';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(80, 'Keep the name under 80 characters'),
});
type Values = z.infer<typeof schema>;

export interface CreateOrganizationFormProps {
  /** Called right before navigating away on success — e.g. to close a dialog. */
  onSuccess?: () => void;
}

export function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps = {}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await createOrganization(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    onSuccess?.();
    router.push('/dashboard');
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          autoFocus
          autoComplete="organization"
          placeholder="e.g. Acme Inc."
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        <p className="text-xs text-muted-foreground">You can invite teammates once it&apos;s created.</p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create organization'}
      </Button>
    </form>
  );
}
