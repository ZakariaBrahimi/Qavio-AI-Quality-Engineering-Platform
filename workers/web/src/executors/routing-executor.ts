import type { TestExecutionContext, TestExecutionResult, TestExecutor } from '@qavio/queue';

export interface RoutingTestExecutorDeps {
  /** Loaded once per run to decide which real executor handles it — `null` when the project/environment can't be resolved at all (the chosen executor hits the same lookup and produces its own normal "not found" failure, so this never needs to fabricate one itself). */
  loadPlatform(context: TestExecutionContext): Promise<'web' | 'mobile' | 'api' | null>;
  webExecutor: TestExecutor;
  fallbackExecutor: TestExecutor;
}

/**
 * Phase 7 adds a real engine for `web` projects only — mobile/api projects
 * are explicitly out of scope (see docs/test-run-engine.md's "NO OTHER QA
 * ENGINES" section) and keep running the deterministic placeholder. This
 * is the one place that routing decision is made, so `worker.ts`'s own
 * orchestration never needs to know a project's platform at all.
 */
export class RoutingTestExecutor implements TestExecutor {
  constructor(private readonly deps: RoutingTestExecutorDeps) {}

  async execute(context: TestExecutionContext): Promise<TestExecutionResult> {
    const platform = await this.deps.loadPlatform(context);
    const executor = platform === 'web' ? this.deps.webExecutor : this.deps.fallbackExecutor;
    return executor.execute(context);
  }
}
