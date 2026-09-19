import type { EnvironmentAuthMethod, EnvironmentKind, ProjectPlatform, TestRunType } from '@qavio/types';

/**
 * Every platform the schema models (`project_platform` in
 * supabase/migrations) — kept in sync so the schema never has to change
 * shape when mobile/API execution ships. Only `web` is actually
 * selectable in the create-project UI today (see
 * `components/projects/create-project-form.tsx`); mobile and API show
 * as real, visible, disabled options rather than being hidden, so the
 * roadmap is honest instead of silent.
 */
export const PROJECT_PLATFORMS: readonly ProjectPlatform[] = ['web', 'mobile', 'api'];

export const PROJECT_PLATFORM_LABELS: Record<ProjectPlatform, string> = {
  web: 'Web',
  mobile: 'Mobile',
  api: 'API',
};

export const AVAILABLE_PROJECT_PLATFORMS: readonly ProjectPlatform[] = ['web'];

export const ENVIRONMENT_KINDS: readonly EnvironmentKind[] = [
  'production',
  'staging',
  'preview',
  'local',
];

export const ENVIRONMENT_KIND_LABELS: Record<EnvironmentKind, string> = {
  production: 'Production',
  staging: 'Staging',
  preview: 'Preview',
  local: 'Local',
};

export const ENVIRONMENT_AUTH_METHODS: readonly EnvironmentAuthMethod[] = ['none', 'stored_state', 'credentials'];

export const ENVIRONMENT_AUTH_METHOD_LABELS: Record<EnvironmentAuthMethod, string> = {
  none: 'None',
  stored_state: 'Pre-authenticated session (recommended)',
  credentials: 'Email/password + OTP login (not yet implemented)',
};

export const ENVIRONMENT_AUTH_METHOD_DESCRIPTIONS: Record<EnvironmentAuthMethod, string> = {
  none: "Test runs never attempt to log in. If the target redirects to what looks like a login page anyway, the run is marked Blocked — never silently passed against the login page.",
  stored_state: 'Applies a Playwright storageState (cookies + local storage) captured from an already-authenticated session to each run\'s own isolated browser context. The pasted value is never displayed again after saving.',
  credentials: 'Modeled for a future email/password + OTP flow. Selecting this today always produces a Blocked run with an explicit reason — Qavio never fakes a login.',
};

/** Only `functional` has a real worker in this phase — see `TestRunType`. */
export const TEST_RUN_TYPE_LABELS: Record<TestRunType, string> = {
  functional: 'Functional',
  visual: 'Visual',
  responsive: 'Responsive',
  security: 'Security',
};
