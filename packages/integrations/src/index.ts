import type { IntegrationProvider } from '@qavio/types';

/**
 * Bug export destinations Qavio will support. Listed now so the schema and
 * UI can reference the full set of providers without implementing any of
 * them yet — see docs/architecture.md for phase scope.
 */
export const PLANNED_INTEGRATION_PROVIDERS: readonly IntegrationProvider[] = [
  'jira',
  'clickup',
  'notion',
  'linear',
  'github',
  'gitlab',
];
