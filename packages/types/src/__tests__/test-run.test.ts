import { describe, expect, it } from 'vitest';

import { isTestRunFinished } from '../test-run';

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
