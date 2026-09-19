import { describe, expect, it, vi } from 'vitest';

import type { TestExecutionContext, TestExecutionResult, TestExecutor } from '@qavio/queue';

import { RoutingTestExecutor } from '../routing-executor';

function makeContext(): TestExecutionContext {
  return {
    testRunId: 'run-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    type: 'functional',
    configuration: {},
    signal: new AbortController().signal,
  };
}

function fakeExecutor(result: TestExecutionResult): TestExecutor {
  return { execute: vi.fn().mockResolvedValue(result) };
}

describe('RoutingTestExecutor', () => {
  it('routes a web-platform project to the web executor', async () => {
    const webExecutor = fakeExecutor({ status: 'completed', results: [] });
    const fallbackExecutor = fakeExecutor({ status: 'completed', results: [] });
    const executor = new RoutingTestExecutor({
      loadPlatform: async () => 'web',
      webExecutor,
      fallbackExecutor,
    });

    await executor.execute(makeContext());

    expect(webExecutor.execute).toHaveBeenCalledTimes(1);
    expect(fallbackExecutor.execute).not.toHaveBeenCalled();
  });

  it.each(['mobile', 'api'] as const)('routes a %s-platform project to the fallback executor', async (platform) => {
    const webExecutor = fakeExecutor({ status: 'completed', results: [] });
    const fallbackExecutor = fakeExecutor({ status: 'completed', results: [] });
    const executor = new RoutingTestExecutor({
      loadPlatform: async () => platform,
      webExecutor,
      fallbackExecutor,
    });

    await executor.execute(makeContext());

    expect(fallbackExecutor.execute).toHaveBeenCalledTimes(1);
    expect(webExecutor.execute).not.toHaveBeenCalled();
  });

  it('routes to the fallback executor when the platform cannot be resolved', async () => {
    const webExecutor = fakeExecutor({ status: 'completed', results: [] });
    const fallbackExecutor = fakeExecutor({ status: 'failed', errorMessage: 'not found', results: [] });
    const executor = new RoutingTestExecutor({
      loadPlatform: async () => null,
      webExecutor,
      fallbackExecutor,
    });

    const result = await executor.execute(makeContext());

    expect(fallbackExecutor.execute).toHaveBeenCalledTimes(1);
    expect(webExecutor.execute).not.toHaveBeenCalled();
    expect(result.status).toBe('failed');
  });

  it('returns the chosen executor result unmodified', async () => {
    const expected: TestExecutionResult = { status: 'completed', results: [{ id: 'r1', name: 'x', status: 'passed', durationMs: 1 }] };
    const executor = new RoutingTestExecutor({
      loadPlatform: async () => 'web',
      webExecutor: fakeExecutor(expected),
      fallbackExecutor: fakeExecutor({ status: 'completed', results: [] }),
    });

    const result = await executor.execute(makeContext());

    expect(result).toBe(expected);
  });
});
