'use client';

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@qavio/ui';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { ENVIRONMENT_KINDS, ENVIRONMENT_KIND_LABELS } from '@/lib/project-constants';

export interface EnvironmentFormValues {
  name: string;
  kind: string;
  baseUrl: string;
  configuration?: string;
}

export interface EnvironmentFormFieldsProps {
  idPrefix: string;
  register: UseFormRegister<EnvironmentFormValues>;
  errors: FieldErrors<EnvironmentFormValues>;
  kind: string;
  onKindChange: (value: string) => void;
}

/** Shared fields for create/edit environment forms, so the two dialogs can't drift apart. */
export function EnvironmentFormFields({ idPrefix, register, errors, kind, onKindChange }: EnvironmentFormFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <Input
            id={`${idPrefix}-name`}
            placeholder="e.g. Staging"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-kind`}>Kind</Label>
          <Select value={kind} onValueChange={onKindChange}>
            <SelectTrigger id={`${idPrefix}-kind`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENT_KINDS.map((option) => (
                <SelectItem key={option} value={option}>
                  {ENVIRONMENT_KIND_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-base-url`}>Base URL</Label>
        <Input
          id={`${idPrefix}-base-url`}
          placeholder="https://staging.example.com"
          aria-invalid={Boolean(errors.baseUrl)}
          {...register('baseUrl')}
        />
        {errors.baseUrl ? <p className="text-xs text-destructive">{errors.baseUrl.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-configuration`}>Configuration (optional JSON)</Label>
        <Textarea
          id={`${idPrefix}-configuration`}
          rows={3}
          placeholder={'{\n  "timeoutMs": 30000\n}'}
          className="font-mono text-xs"
          aria-invalid={Boolean(errors.configuration)}
          {...register('configuration')}
        />
        {errors.configuration ? (
          <p className="text-xs text-destructive">{errors.configuration.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Free-form settings for test runs against this environment — custom headers, viewport,
            feature flags. Leave empty for none.
          </p>
        )}
      </div>
    </>
  );
}
