import { describe, expect, it } from 'vitest';

import { isTestRunFinished } from '../test-run';

describe('isTestRunFinished', () => {
  it('treats queued and running as unfinished', () => {
    expect(isTestRunFinished('queued')).toBe(false);
    expect(isTestRunFinished('running')).toBe(false);
  });

  it('treats passed, failed, cancelled, and error as finished', () => {
    expect(isTestRunFinished('passed')).toBe(true);
    expect(isTestRunFinished('failed')).toBe(true);
    expect(isTestRunFinished('cancelled')).toBe(true);
    expect(isTestRunFinished('error')).toBe(true);
  });
});
