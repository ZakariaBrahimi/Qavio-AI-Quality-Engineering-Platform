'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Environment, EnvironmentAuthMethod } from '@qavio/types';
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@qavio/ui';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  saveEnvironmentStoredState,
  setEnvironmentAuthMethod,
  updateEnvironment,
} from '@/app/(dashboard)/projects/[id]/actions';
import { EnvironmentFormFields } from '@/components/environments/environment-form-fields';
import {
  ENVIRONMENT_AUTH_METHODS,
  ENVIRONMENT_AUTH_METHOD_DESCRIPTIONS,
  ENVIRONMENT_AUTH_METHOD_LABELS,
} from '@/lib/project-constants';

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
  /** Authentication configuration writes a secret (or at least changes how test runs authenticate against a real target), so it's gated stricter than the rest of this dialog — see `saveEnvironmentStoredState`'s own admin-only check, which this only mirrors for UI purposes. */
  canConfigureAuth: boolean;
}

export function EditEnvironmentDialog({ environment, open, onOpenChange, canConfigureAuth }: EditEnvironmentDialogProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const [authMethod, setAuthMethod] = useState<EnvironmentAuthMethod>(environment.authMethod);
  const [storageStateJson, setStorageStateJson] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSavingAuthMethod, startSavingAuthMethod] = useTransition();
  const [isSavingStoredState, startSavingStoredState] = useTransition();

  function handleSaveAuthMethod(nextMethod: EnvironmentAuthMethod) {
    setAuthMethod(nextMethod);
    if (nextMethod === 'stored_state') return; // needs a pasted storage state first — see handleSaveStoredState
    setAuthError(null);
    startSavingAuthMethod(async () => {
      const result = await setEnvironmentAuthMethod({
        environmentId: environment.id,
        projectId: environment.projectId,
        authMethod: nextMethod,
      });
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }
      toast.success('Authentication method updated.');
      router.refresh();
    });
  }

  function handleSaveStoredState() {
    setAuthError(null);
    startSavingStoredState(async () => {
      const result = await saveEnvironmentStoredState({
        environmentId: environment.id,
        projectId: environment.projectId,
        storageStateJson,
      });
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }
      setStorageStateJson('');
      toast.success('Stored session state saved.');
      router.refresh();
    });
  }

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
      setAuthMethod(environment.authMethod);
      setStorageStateJson('');
      setAuthError(null);
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

        {canConfigureAuth ? (
          <div className="space-y-4 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
              <p className="text-xs text-muted-foreground">
                How test runs against this environment should authenticate. Never inferred from the URL — Qavio
                never attempts to log into a target on its own.
              </p>
            </div>

            {authError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-env-auth-method">Authentication method</Label>
              <Select
                value={authMethod}
                onValueChange={(value) => handleSaveAuthMethod(value as EnvironmentAuthMethod)}
                disabled={isSavingAuthMethod}
              >
                <SelectTrigger id="edit-env-auth-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENT_AUTH_METHODS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {ENVIRONMENT_AUTH_METHOD_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ENVIRONMENT_AUTH_METHOD_DESCRIPTIONS[authMethod]}</p>
            </div>

            {authMethod === 'stored_state' ? (
              <div className="space-y-1.5">
                <Label htmlFor="edit-env-storage-state">
                  Playwright storage state {environment.authCredentialId ? '(configured — paste to replace)' : ''}
                </Label>
                <Textarea
                  id="edit-env-storage-state"
                  rows={5}
                  placeholder={'{\n  "cookies": [...],\n  "origins": [...]\n}'}
                  className="font-mono text-xs"
                  value={storageStateJson}
                  onChange={(event) => setStorageStateJson(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Export this from an already-authenticated Playwright session (`context.storageState()`). Never
                  displayed again after saving — treat it as a secret, same as a password.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSavingStoredState || storageStateJson.trim().length === 0}
                  onClick={handleSaveStoredState}
                >
                  {isSavingStoredState ? 'Saving…' : 'Save stored session state'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
