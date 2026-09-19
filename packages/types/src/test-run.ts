import type { Id, Timestamp } from './common';

/**
 * The lifecycle of a Test Run. Mirrors the worker's own state machine
 * (see supabase/migrations) plus an `analyzing` step for the AI analysis
 * pass, so the control plane never has to infer run state from queue job
 * state — the worker updates test_runs directly.
 */
export type TestRunStatus =
  | 'created'
  | 'queued'
  | 'starting'
  | 'running'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

/** Only `functional` has a real worker in this phase. */
export type TestRunType = 'functional' | 'visual' | 'responsive' | 'security';

export interface TestRun {
  id: Id;
  organizationId: Id;
  projectId: Id;
  environmentId: Id;
  testSuiteId: Id | null;
  type: TestRunType;
  status: TestRunStatus;
  /** Run-level configuration (coverage mode, instructions, options) — the queue payload never carries this; the worker loads it from this row instead. Phase 6 persists it but the placeholder executor doesn't interpret it yet. */
  configuration: Record<string, unknown>;
  /** A short, human-readable status line written at a handful of named milestones while a run is executing (e.g. "Checking page 3 of up to 15: https://…") — display only, never gates a state transition. `null` before execution starts or once a run's own results speak for themselves. */
  progress: string | null;
  /** A completion summary (pages checked, passed/failed, cancelled, …) — shape is producer-defined (Phase 7's Playwright engine writes pagesChecked/pagesPassed/pagesFailed/cancelled; Phase 6's placeholder never writes one). `{}` until a run finishes. */
  summary: Record<string, unknown>;
  /** Set only on a run-level failure (couldn't start, timed out, worker crashed) — not per-test-result detail, which lives on TestResult. */
  errorMessage: string | null;
  triggeredBy: Id | null;
  startedAt: Timestamp | null;
  finishedAt: Timestamp | null;
  createdAt: Timestamp;
}

export const TEST_RUN_TERMINAL_STATUSES: readonly TestRunStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'blocked',
];

/** True once a run has stopped executing, whatever its outcome. */
export function isTestRunFinished(status: TestRunStatus): boolean {
  return TEST_RUN_TERMINAL_STATUSES.includes(status);
}

/**
 * The one authoritative map of legal Test Run state transitions — used
 * by both the control plane (apps/web, creating/cancelling a run) and
 * the execution plane (workers/web, driving a run through its
 * lifecycle), so neither can drift from the other or allow a
 * transition the other side would reject. This is what "centralized
 * state transition mechanism" means in docs/test-run-engine.md: one
 * map, imported everywhere a status is written, never hand-rolled
 * per-caller.
 *
 * Happy path: created -> queued -> starting -> running -> completed
 * (running -> analyzing -> completed is allowed for a future AI
 * analysis pass, not produced by anything in this phase).
 * Failure: any non-terminal state -> failed (enqueueing can fail
 * before a job even exists, a worker can fail while starting up, etc.
 * — not just running -> failed).
 * Blocked: any non-terminal state -> blocked, same shape as `failed` but
 * a distinct outcome — the run didn't fail because the target is broken,
 * it couldn't proceed because it hit an authentication requirement Qavio
 * isn't configured to satisfy (see PlaywrightTestExecutor). Never written
 * as a disguised `completed`; see docs/authentication-qa.md.
 * Cancellation: any non-terminal state -> cancelled, EXCEPT `created`
 * — the control plane never leaves a run sitting in `created`; it's
 * queued (or immediately failed) in the same action that creates it,
 * so there is no moment a user could cancel one from that state.
 * completed/failed/cancelled/blocked are terminal: no outgoing transitions.
 */
export const TEST_RUN_TRANSITIONS: Readonly<Record<TestRunStatus, readonly TestRunStatus[]>> = {
  created: ['queued', 'failed'],
  queued: ['starting', 'failed', 'cancelled', 'blocked'],
  starting: ['running', 'failed', 'cancelled', 'blocked'],
  running: ['analyzing', 'completed', 'failed', 'cancelled', 'blocked'],
  analyzing: ['completed', 'failed', 'cancelled', 'blocked'],
  completed: [],
  failed: [],
  cancelled: [],
  blocked: [],
};

export function canTransitionTestRunStatus(from: TestRunStatus, to: TestRunStatus): boolean {
  return TEST_RUN_TRANSITIONS[from].includes(to);
}

/** Thrown by `assertTestRunTransition` — a caller can match on this type to distinguish "invalid transition" from any other error. */
export class InvalidTestRunTransitionError extends Error {
  constructor(
    public readonly from: TestRunStatus,
    public readonly to: TestRunStatus,
  ) {
    super(`Cannot transition test run from "${from}" to "${to}".`);
    this.name = 'InvalidTestRunTransitionError';
  }
}

/** Throws `InvalidTestRunTransitionError` instead of silently no-opting — every caller (producer and worker alike) must handle an invalid transition explicitly rather than accidentally writing bad state. */
export function assertTestRunTransition(from: TestRunStatus, to: TestRunStatus): void {
  if (!canTransitionTestRunStatus(from, to)) {
    throw new InvalidTestRunTransitionError(from, to);
  }
}
