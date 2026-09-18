import { z } from 'zod';

/** Payload enqueued by the control plane when a functional Test Run starts. */
export const testRunJobSchema = z.object({
  testRunId: z.string().uuid(),
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  baseUrl: z.string().url(),
});

export type TestRunJob = z.infer<typeof testRunJobSchema>;
