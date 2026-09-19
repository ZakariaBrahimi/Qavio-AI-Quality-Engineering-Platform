'use server';

import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { mapDbError } from '@/lib/db-errors';
import { ENVIRONMENT_KINDS } from '@/lib/project-constants';
import { getCurrentOrganization } from '@/lib/organizations';
import { hasPermission, hasRole } from '@/lib/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const urlSchema = z
  .string()
  .min(1, 'Base URL is required')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter a valid http(s) URL, e.g. https://staging.example.com');

/** Accepts an empty string as "{}" — the form's textarea starts empty, which should mean "no configuration", not an error. */
const configurationSchema = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value : '{}'))
  .superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Configuration must be a JSON object, e.g. {"timeout": 30}' });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Configuration must be valid JSON.' });
    }
  });

const environmentFieldsSchema = z.object({
  name: z.string().min(1, 'Environment name is required').max(60, 'Keep it under 60 characters'),
  kind: z.enum(ENVIRONMENT_KINDS as [string, ...string[]]),
  baseUrl: urlSchema,
  configuration: configurationSchema,
});

async function requireManageEnvironments() {
  const organization = await getCurrentOrganization();
  if (!organization) return { organization: null, error: fail('No active organization.') };
  if (!hasPermission(organization.role, 'manage_environments')) {
    return { organization: null, error: fail("You don't have permission to manage environments.") };
  }
  return { organization, error: null };
}

export async function createEnvironment(input: {
  projectId: string;
  name: string;
  kind: string;
  baseUrl: string;
  configuration?: string;
}): Promise<ActionResult<{ environmentId: string }>> {
  const parsed = environmentFieldsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const { organization, error } = await requireManageEnvironments();
  if (error) return error;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The project's first environment becomes its default automatically —
  // otherwise every project would start with no default and nothing in
  // the UI to pick one from yet.
  const { count: existingCount } = await supabase
    .from('environments')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organization.organizationId)
    .eq('project_id', input.projectId);

  const { data: environment, error: insertError } = await supabase
    .from('environments')
    .insert({
      organization_id: organization.organizationId,
      project_id: input.projectId,
      name: parsed.data.name,
      kind: parsed.data.kind as (typeof ENVIRONMENT_KINDS)[number],
      base_url: parsed.data.baseUrl,
      configuration: JSON.parse(parsed.data.configuration),
      is_default: (existingCount ?? 0) === 0,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();

  if (insertError || !environment) return fail(mapDbError(insertError));

  await supabase.rpc('log_audit_event', {
    p_organization_id: organization.organizationId,
    p_action: 'environment_created',
    p_target_type: 'environment',
    p_target_id: environment.id,
    p_metadata: { name: parsed.data.name, project_id: input.projectId },
  });

  return ok({ environmentId: environment.id });
}

export async function updateEnvironment(input: {
  environmentId: string;
  projectId: string;
  name: string;
  kind: string;
  baseUrl: string;
  configuration?: string;
}): Promise<ActionResult> {
  const parsed = environmentFieldsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const { organization, error } = await requireManageEnvironments();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('environments')
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind as (typeof ENVIRONMENT_KINDS)[number],
      base_url: parsed.data.baseUrl,
      configuration: JSON.parse(parsed.data.configuration),
    })
    .eq('id', input.environmentId)
    .eq('project_id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

export async function archiveEnvironment(input: {
  environmentId: string;
  projectId: string;
}): Promise<ActionResult> {
  const { organization, error } = await requireManageEnvironments();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('environments')
    .update({ archived_at: new Date().toISOString(), is_default: false })
    .eq('id', input.environmentId)
    .eq('project_id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

export async function restoreEnvironment(input: {
  environmentId: string;
  projectId: string;
}): Promise<ActionResult> {
  const { organization, error } = await requireManageEnvironments();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('environments')
    .update({ archived_at: null })
    .eq('id', input.environmentId)
    .eq('project_id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

/** Hard delete — irreversible. Admin+, stricter than create/update/archive (developer+). */
export async function deleteEnvironment(input: {
  environmentId: string;
  projectId: string;
}): Promise<ActionResult> {
  const organization = await getCurrentOrganization();
  if (!organization) return fail('No active organization.');
  if (!hasPermission(organization.role, 'delete_environment')) {
    return fail("You don't have permission to delete environments.");
  }

  const supabase = createClient();
  const { error: deleteError } = await supabase
    .from('environments')
    .delete()
    .eq('id', input.environmentId)
    .eq('project_id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (deleteError) return fail(mapDbError(deleteError));
  return ok(undefined);
}

export async function setDefaultEnvironment(input: { environmentId: string }): Promise<ActionResult> {
  const { error } = await requireManageEnvironments();
  if (error) return error;

  const supabase = createClient();
  const { error: rpcError } = await supabase.rpc('set_default_environment', {
    p_environment_id: input.environmentId,
  });

  if (rpcError) return fail(mapDbError(rpcError));
  return ok(undefined);
}

/**
 * A Playwright `storageState` is, at minimum, `{ cookies: [...] }` —
 * `origins` (localStorage) is optional. Mirrors
 * workers/web/src/security/auth-context.ts's own `parseStorageState` so a
 * value that's accepted here is guaranteed to be one the worker can later
 * use — never validated more loosely on the write side than the read side.
 */
const storageStateJsonSchema = z
  .string()
  .min(1, 'Paste the storage state JSON exported from an authenticated Playwright session.')
  .superRefine((value, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Not valid JSON.' });
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a storageState object, e.g. { "cookies": [...] }.' });
      return;
    }
    const candidate = parsed as Record<string, unknown>;
    if (!Array.isArray(candidate.cookies)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Missing a "cookies" array.' });
    }
    if (candidate.origins !== undefined && !Array.isArray(candidate.origins)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '"origins", if present, must be an array.' });
    }
  });

async function requireAdmin() {
  const organization = await getCurrentOrganization();
  if (!organization) return { organization: null, error: fail('No active organization.') };
  if (!hasRole(organization.role, 'admin')) {
    return { organization: null, error: fail('Configuring authentication requires an admin role or above.') };
  }
  return { organization, error: null };
}

/**
 * Sets an environment's authentication method without touching any
 * secret — `none`/`credentials` never need one (`credentials` is modeled
 * but not yet implemented by PlaywrightTestExecutor, see
 * packages/types/src/environment.ts). Switching away from `stored_state`
 * detaches the credential reference but doesn't delete the underlying
 * credential row, so re-selecting `stored_state` later can still reuse it
 * (see `saveEnvironmentStoredState`).
 */
export async function setEnvironmentAuthMethod(input: {
  environmentId: string;
  projectId: string;
  authMethod: 'none' | 'credentials';
}): Promise<ActionResult> {
  const { organization, error } = await requireAdmin();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('environments')
    .update({ auth_method: input.authMethod, auth_credential_id: null })
    .eq('id', input.environmentId)
    .eq('project_id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));

  await supabase.rpc('log_audit_event', {
    p_organization_id: organization.organizationId,
    p_action: 'environment_auth_method_changed',
    p_target_type: 'environment',
    p_target_id: input.environmentId,
    p_metadata: { auth_method: input.authMethod },
  });

  return ok(undefined);
}

/**
 * The one path a `playwright_storage_state` credential's secret ever
 * enters Qavio: admin-only (stricter than `manage_environments`'s
 * developer+, since this is the action that actually receives a secret
 * value), validated before it ever reaches the database, and never
 * re-read or echoed back afterward — the edit dialog's textarea always
 * starts empty (see EditEnvironmentDialog), and this action's return
 * value carries no secret material, only success/failure.
 *
 * The secret itself only ever reaches Supabase Vault via
 * `create_credential_secret()`, which is service_role-only (see
 * supabase/migrations/20250201002200_environment_authentication.sql) —
 * that's the one thing here that needs `createAdminClient()` rather than
 * the caller's own session-scoped client; everything else (the
 * credentials *metadata* row, the environment update) goes through the
 * normal RLS-gated client like every other action in this file.
 */
export async function saveEnvironmentStoredState(input: {
  environmentId: string;
  projectId: string;
  storageStateJson: string;
}): Promise<ActionResult> {
  const parsedJson = storageStateJsonSchema.safeParse(input.storageStateJson);
  if (!parsedJson.success) return fail(parsedJson.error.issues[0]?.message ?? 'Invalid storage state.');

  const { organization, error } = await requireAdmin();
  if (error) return error;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: environment, error: environmentError } = await supabase
    .from('environments')
    .select('id, name, auth_credential_id')
    .eq('id', input.environmentId)
    .eq('project_id', input.projectId)
    .eq('organization_id', organization.organizationId)
    .maybeSingle();

  if (environmentError) return fail(mapDbError(environmentError));
  if (!environment) return fail('Environment not found.');

  let credentialId = environment.auth_credential_id;
  let createdNewCredential = false;

  if (!credentialId) {
    const { data: credential, error: credentialError } = await supabase
      .from('credentials')
      .insert({
        organization_id: organization.organizationId,
        project_id: input.projectId,
        environment_id: input.environmentId,
        name: `${environment.name} — stored session state`,
        type: 'playwright_storage_state',
        created_by: user?.id ?? null,
      })
      .select('id')
      .single();

    if (credentialError || !credential) return fail(mapDbError(credentialError));
    credentialId = credential.id;
    createdNewCredential = true;
  }

  const admin = createAdminClient();
  const { error: secretError } = await admin.rpc('create_credential_secret', {
    p_credential_id: credentialId,
    p_secret: input.storageStateJson,
  });

  if (secretError) {
    if (createdNewCredential) {
      // Best-effort cleanup — never leave a credential row with no secret behind it.
      await supabase.from('credentials').delete().eq('id', credentialId);
    }
    return fail('Could not store the authentication state. Please try again.');
  }

  const { error: updateError } = await supabase
    .from('environments')
    .update({ auth_method: 'stored_state', auth_credential_id: credentialId })
    .eq('id', input.environmentId)
    .eq('project_id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));

  await supabase.rpc('log_audit_event', {
    p_organization_id: organization.organizationId,
    p_action: 'environment_auth_method_changed',
    p_target_type: 'environment',
    p_target_id: input.environmentId,
    p_metadata: { auth_method: 'stored_state', rotated: !createdNewCredential },
  });

  return ok(undefined);
}
