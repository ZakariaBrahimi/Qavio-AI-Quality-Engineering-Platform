'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Environment } from '@qavio/types';
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
} from '@qavio/ui';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { updateEnvironment } from '@/app/(dashboard)/projects/[id]/actions';
import { EnvironmentFormFields } from '@/components/environments/environment-form-fields';

const schema = z.object({
  name: z.string().min(1, 'Environment name is required').max(60, 'Keep it under 60 characters'),
  kind: z.string().min(1),
  baseUrl: z.string().min(1, 'Base URL is required'),
  configuration: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export interface EditEnvironmentDialogProps {
  environment: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEnvironmentDialog({ environment, open, onOpenChange }: EditEnvironmentDialogProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: environment.name,
      kind: environment.kind,
      baseUrl: environment.baseUrl,
      configuration: JSON.stringify(environment.configuration, null, 2),
    },
  });

  const kind = watch('kind');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateEnvironment({
      environmentId: environment.id,
      projectId: environment.projectId,
      ...values,
    });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      reset();
      setFormError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit environment</DialogTitle>
          <DialogDescription>Update {environment.name}&apos;s configuration.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <EnvironmentFormFields
            idPrefix="edit-env"
            register={register}
            errors={errors}
            kind={kind}
            onKindChange={(value) => setValue('kind', value, { shouldDirty: true })}
          />

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
