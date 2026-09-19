import { z } from 'zod';

import type { TestRunType } from '@qavio/types';

/** Kept in lockstep with `TestRunType` via the `satisfies` check below — extending one without the other is a type error, not a silent runtime gap. */
const TEST_RUN_TYPES = ['functional', 'visual', 'responsive', 'security'] as const satisfies readonly TestRunType[];

/**
 * What actually travels through Redis when a Test Run is enqueued.
 *
 * Deliberately minimal identifiers only — no `baseUrl`, no credentials, no
 * copy of `test_runs.configuration`. The database remains the source of
 * truth for test-run state (see docs/test-run-engine.md): the worker loads
 * the full row by `testRunId` instead of trusting a payload that could go
 * stale between enqueue and execution, or leak a secret into Redis/BullMQ's
 * own storage. Reference credentials by id (`environmentId`) and let the
 * worker resolve them server-side when it actually needs them.
 */
export const testRunJobPayloadSchema = z.object({
  testRunId: z.string().uuid(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  type: z.enum(TEST_RUN_TYPES),
});

export type TestRunJobPayload = z.infer<typeof testRunJobPayloadSchema>;
