'use server';

import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { mapDbError } from '@/lib/db-errors';
import { ENVIRONMENT_KINDS } from '@/lib/project-constants';
import { getCurrentOrganization } from '@/lib/organizations';
import { hasPermission } from '@/lib/rbac';
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
