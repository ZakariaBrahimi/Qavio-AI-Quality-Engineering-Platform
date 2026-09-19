/**
 * Shared BullMQ queue name between the control plane (producer, apps/web)
 * and the execution plane (consumer, workers/web). Both sides import this
 * constant rather than hand-typing the string, so they can never drift.
 */
export const TEST_RUN_QUEUE_NAME = 'test-runs';
