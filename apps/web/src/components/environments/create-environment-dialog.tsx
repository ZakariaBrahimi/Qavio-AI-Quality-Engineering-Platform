'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@qavio/ui';
import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createEnvironment } from '@/app/(dashboard)/projects/[id]/actions';
import { EnvironmentFormFields } from '@/components/environments/environment-form-fields';

const schema = z.object({
  name: z.string().min(1, 'Environment name is required').max(60, 'Keep it under 60 characters'),
  kind: z.string().min(1),
  baseUrl: z.string().min(1, 'Base URL is required'),
  configuration: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function CreateEnvironmentDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { kind: 'staging' } });

  const kind = watch('kind');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await createEnvironment({ projectId, ...values });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setOpen(false);
    reset({ kind: 'staging' });
    router.refresh();
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset({ kind: 'staging' });
      setFormError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Environment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create environment</DialogTitle>
          <DialogDescription>Where should test runs against this project point?</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <EnvironmentFormFields
            idPrefix="create-env"
            register={register}
            errors={errors}
            kind={kind}
            onKindChange={(value) => setValue('kind', value)}
          />

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create environment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
