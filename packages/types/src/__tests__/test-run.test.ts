import { describe, expect, it } from 'vitest';

import {
  assertTestRunTransition,
  canTransitionTestRunStatus,
  InvalidTestRunTransitionError,
  isTestRunFinished,
  TEST_RUN_TERMINAL_STATUSES,
  type TestRunStatus,
} from '../test-run';

describe('isTestRunFinished', () => {
  it('treats created, queued, starting, running, and analyzing as unfinished', () => {
    expect(isTestRunFinished('created')).toBe(false);
    expect(isTestRunFinished('queued')).toBe(false);
    expect(isTestRunFinished('starting')).toBe(false);
    expect(isTestRunFinished('running')).toBe(false);
    expect(isTestRunFinished('analyzing')).toBe(false);
  });

  it('treats completed, failed, and cancelled as finished', () => {
    expect(isTestRunFinished('completed')).toBe(true);
    expect(isTestRunFinished('failed')).toBe(true);
    expect(isTestRunFinished('cancelled')).toBe(true);
  });
});

describe('canTransitionTestRunStatus — the happy path', () => {
  it('allows the full lifecycle: created -> queued -> starting -> running -> completed', () => {
    expect(canTransitionTestRunStatus('created', 'queued')).toBe(true);
    expect(canTransitionTestRunStatus('queued', 'starting')).toBe(true);
    expect(canTransitionTestRunStatus('starting', 'running')).toBe(true);
    expect(canTransitionTestRunStatus('running', 'completed')).toBe(true);
  });

  it('allows the optional analyzing step between running and completed', () => {
    expect(canTransitionTestRunStatus('running', 'analyzing')).toBe(true);
    expect(canTransitionTestRunStatus('analyzing', 'completed')).toBe(true);
  });
});

describe('canTransitionTestRunStatus — failure, from any non-terminal status', () => {
  const nonTerminal: TestRunStatus[] = ['created', 'queued', 'starting', 'running', 'analyzing'];

  it.each(nonTerminal)('allows %s -> failed', (status) => {
    expect(canTransitionTestRunStatus(status, 'failed')).toBe(true);
  });
});

describe('canTransitionTestRunStatus — cancellation', () => {
  const cancellable: TestRunStatus[] = ['queued', 'starting', 'running', 'analyzing'];

  it.each(cancellable)('allows %s -> cancelled', (status) => {
    expect(canTransitionTestRunStatus(status, 'cancelled')).toBe(true);
  });

  it('does not allow created -> cancelled (the control plane always queues or fails a new run immediately)', () => {
    expect(canTransitionTestRunStatus('created', 'cancelled')).toBe(false);
  });
});

describe('canTransitionTestRunStatus — terminal statuses have no outgoing transitions', () => {
  it.each(TEST_RUN_TERMINAL_STATUSES)('rejects every transition out of %s', (status) => {
    const allStatuses: TestRunStatus[] = [
      'created',
      'queued',
      'starting',
      'running',
      'analyzing',
      'completed',
      'failed',
      'cancelled',
    ];
    for (const to of allStatuses) {
      expect(canTransitionTestRunStatus(status, to)).toBe(false);
    }
  });
});

describe('canTransitionTestRunStatus — arbitrary invalid transitions are rejected', () => {
  it('rejects skipping straight from created to running', () => {
    expect(canTransitionTestRunStatus('created', 'running')).toBe(false);
  });

  it('rejects moving backwards from running to queued', () => {
    expect(canTransitionTestRunStatus('running', 'queued')).toBe(false);
  });

  it('rejects starting -> analyzing (analyzing only follows running)', () => {
    expect(canTransitionTestRunStatus('starting', 'analyzing')).toBe(false);
  });
});

describe('assertTestRunTransition', () => {
  it('does not throw for a legal transition', () => {
    expect(() => assertTestRunTransition('queued', 'starting')).not.toThrow();
  });

  it('throws InvalidTestRunTransitionError for an illegal transition, naming both statuses', () => {
    expect(() => assertTestRunTransition('completed', 'running')).toThrow(InvalidTestRunTransitionError);
    try {
      assertTestRunTransition('completed', 'running');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTestRunTransitionError);
      if (error instanceof InvalidTestRunTransitionError) {
        expect(error.from).toBe('completed');
        expect(error.to).toBe('running');
      }
    }
  });
});
