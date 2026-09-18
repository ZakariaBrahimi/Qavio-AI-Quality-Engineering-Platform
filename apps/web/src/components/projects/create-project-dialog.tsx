'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@qavio/ui';
import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createProject } from '@/app/(dashboard)/projects/actions';
import { AVAILABLE_PROJECT_PLATFORMS, PROJECT_PLATFORMS, PROJECT_PLATFORM_LABELS } from '@/lib/project-constants';

const schema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(80, 'Keep it under 80 characters'),
  description: z.string().max(500, 'Keep the description under 500 characters').optional(),
  platform: z.string().min(1, 'Select a platform'),
});
type Values = z.infer<typeof schema>;

export function CreateProjectDialog() {
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
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { platform: 'web' } });

  const platform = watch('platform');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await createProject(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setOpen(false);
    reset();
    router.push(`/projects/${result.data.projectId}`);
    router.refresh();
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
      setFormError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            A project represents one application you want Qavio to test.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              autoFocus
              placeholder="e.g. Marketing Site"
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description (optional)</Label>
            <Textarea
              id="project-description"
              placeholder="What is this application?"
              rows={3}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-platform">Platform</Label>
            <Select value={platform} onValueChange={(value) => setValue('platform', value)}>
              <SelectTrigger id="project-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_PLATFORMS.map((option) => {
                  const available = AVAILABLE_PROJECT_PLATFORMS.includes(option);
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
              {isSubmitting ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
