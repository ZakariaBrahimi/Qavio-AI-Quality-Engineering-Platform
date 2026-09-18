'use server';

import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { mapDbError } from '@/lib/db-errors';
import { getCurrentOrganization } from '@/lib/organizations';
import { AVAILABLE_PROJECT_PLATFORMS, PROJECT_PLATFORMS } from '@/lib/project-constants';
import { hasPermission } from '@/lib/rbac';
import { slugify } from '@/lib/slug';
import { createClient } from '@/lib/supabase/server';

const projectFieldsSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(80, 'Keep it under 80 characters'),
  description: z.string().max(500, 'Keep the description under 500 characters').optional(),
  platform: z.enum(PROJECT_PLATFORMS as [string, ...string[]]),
});

function normalizeDescription(description: string | null | undefined): string | null {
  const trimmed = description?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Every mutation below re-checks the caller's role before touching
 * anything, even though Postgres RLS (see supabase/migrations) would
 * reject an unauthorized write anyway — same pattern as
 * (dashboard)/team/actions.ts: this turns a would-be raw RLS rejection
 * into a clear message. RLS remains the actual boundary.
 */
async function requireManageProjects() {
  const organization = await getCurrentOrganization();
  if (!organization) return { organization: null, error: fail('No active organization.') };
  if (!hasPermission(organization.role, 'manage_projects')) {
    return { organization: null, error: fail("You don't have permission to manage projects.") };
  }
  return { organization, error: null };
}

export async function createProject(input: {
  name: string;
  description?: string | null;
  platform: string;
}): Promise<ActionResult<{ projectId: string }>> {
  const parsed = projectFieldsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  if (!AVAILABLE_PROJECT_PLATFORMS.includes(parsed.data.platform as never)) {
    return fail('That platform is not available yet.');
  }

  const { organization, error } = await requireManageProjects();
  if (error) return error;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const slug = `${slugify(parsed.data.name, 'project')}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert({
      organization_id: organization.organizationId,
      name: parsed.data.name,
      description: normalizeDescription(parsed.data.description),
      platform: parsed.data.platform as (typeof PROJECT_PLATFORMS)[number],
      slug,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();

  if (insertError || !project) return fail(mapDbError(insertError));

  return ok({ projectId: project.id });
}

export async function updateProject(input: {
  projectId: string;
  name: string;
  description?: string | null;
  platform: string;
}): Promise<ActionResult> {
  const parsed = projectFieldsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const { organization, error } = await requireManageProjects();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      name: parsed.data.name,
      description: normalizeDescription(parsed.data.description),
      platform: parsed.data.platform as (typeof PROJECT_PLATFORMS)[number],
    })
    .eq('id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

export async function archiveProject(input: { projectId: string }): Promise<ActionResult> {
  const { organization, error } = await requireManageProjects();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

export async function restoreProject(input: { projectId: string }): Promise<ActionResult> {
  const { organization, error } = await requireManageProjects();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('projects')
    .update({ archived_at: null })
    .eq('id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

/** Hard delete: irreversible, cascades to every environment/test suite/run/issue under this project — owner-only. */
export async function deleteProject(input: { projectId: string }): Promise<ActionResult> {
  const organization = await getCurrentOrganization();
  if (!organization) return fail('No active organization.');
  if (!hasPermission(organization.role, 'delete_project')) {
    return fail('Only an owner can permanently delete a project.');
  }

  const supabase = createClient();
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', input.projectId)
    .eq('organization_id', organization.organizationId);

  if (deleteError) return fail(mapDbError(deleteError));
  return ok(undefined);
}
