'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Project } from '@qavio/types';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@qavio/ui';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { updateProject } from '@/app/(dashboard)/projects/actions';
import { AVAILABLE_PROJECT_PLATFORMS, PROJECT_PLATFORMS, PROJECT_PLATFORM_LABELS } from '@/lib/project-constants';

const schema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(80, 'Keep it under 80 characters'),
  description: z.string().max(500, 'Keep the description under 500 characters').optional(),
  platform: z.string().min(1, 'Select a platform'),
});
type Values = z.infer<typeof schema>;

export interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
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
      name: project.name,
      description: project.description ?? '',
      platform: project.platform,
    },
  });

  const platform = watch('platform');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateProject({ projectId: project.id, ...values });
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
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update this project&apos;s details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="edit-project-name">Name</Label>
            <Input id="edit-project-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-project-description">Description (optional)</Label>
            <Textarea id="edit-project-description" rows={3} {...register('description')} />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-project-platform">Platform</Label>
            <Select value={platform} onValueChange={(value) => setValue('platform', value, { shouldDirty: true })}>
              <SelectTrigger id="edit-project-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_PLATFORMS.map((option) => {
                  const available = AVAILABLE_PROJECT_PLATFORMS.includes(option) || option === project.platform;
                  return (
                    <SelectItem key={option} value={option} disabled={!available}>
                      <span className="flex items-center gap-2">
                        {PROJECT_PLATFORM_LABELS[option]}
                        {!available ? (
                          <Badge variant="outline" className="text-[10px]">
                            Coming soon
                          </Badge>
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

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
