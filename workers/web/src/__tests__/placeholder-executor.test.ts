import type { TestExecutionContext } from '@qavio/queue';
import { describe, expect, it } from 'vitest';

import { PlaceholderTestExecutor } from '../executors/placeholder-executor';

function context(overrides: Partial<TestExecutionContext> = {}): TestExecutionContext {
  return {
    testRunId: 'run-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    type: 'functional',
    configuration: {},
    signal: new AbortController().signal,
    ...overrides,
  };
}

describe('PlaceholderTestExecutor', () => {
  it('is deterministic and does not touch Playwright/a browser — completes with one passing result', async () => {
    const executor = new PlaceholderTestExecutor({ defaultDurationMs: 5 });
    const result = await executor.execute(context());

    expect(result.status).toBe('completed');
    expect(result.results).toEqual([
      { name: 'Deterministic check', status: 'passed', durationMs: expect.any(Number), errorMessage: null },
    ]);
  });

  it('respects configuration.durationMs over the constructor default', async () => {
    const executor = new PlaceholderTestExecutor({ defaultDurationMs: 5 });
    const startedAt = Date.now();
    await executor.execute(context({ configuration: { durationMs: 60 } }));
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(55);
  });

  it('reports a deterministic failure when configuration.forceFailure is set', async () => {
    const executor = new PlaceholderTestExecutor({ defaultDurationMs: 5 });
    const result = await executor.execute(context({ configuration: { forceFailure: true } }));

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('forceFailure');
    expect(result.results).toEqual([
      { name: 'Deterministic check', status: 'failed', durationMs: expect.any(Number), errorMessage: 'forceFailure=true' },
    ]);
  });

  it('stops promptly when the signal is aborted mid-run instead of running to completion', async () => {
    const executor = new PlaceholderTestExecutor({ defaultDurationMs: 2_000 });
    const controller = new AbortController();

    const promise = executor.execute(context({ configuration: {}, signal: controller.signal }));
    setTimeout(() => controller.abort(), 60);

    const startedAt = Date.now();
    const result = await promise;
    const elapsed = Date.now() - startedAt;

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/cancelled/i);
    expect(elapsed).toBeLessThan(500);
  });

  it('reports failed immediately when already aborted before the first step', async () => {
    const executor = new PlaceholderTestExecutor({ defaultDurationMs: 1_000 });
    const controller = new AbortController();
    controller.abort();

    const startedAt = Date.now();
    const result = await executor.execute(context({ signal: controller.signal }));

    expect(result.status).toBe('failed');
    expect(Date.now() - startedAt).toBeLessThan(100);
  });
});
