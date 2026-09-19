import { chromium, type Browser, type BrowserContext } from 'playwright';

export interface BrowserManagerOptions {
  /** Server-side only — never a client-facing setting. Defaults to `true` for worker deployments; a developer can flip it locally to watch the browser run. */
  headless: boolean;
  navigationTimeoutMs: number;
}

/**
 * Launches one Chromium instance and one isolated `BrowserContext` for the
 * duration of `fn`, guaranteeing cleanup in `finally` blocks regardless of
 * how `fn` exits (returns, throws, or the caller's signal aborts mid-run)
 * — a browser or context that leaked here would eventually starve the
 * worker of the memory it needs to process the next job.
 *
 * Every Test Run gets its own fresh context: never reused across runs,
 * never sharing cookies/localStorage/sessionStorage between them, and
 * never reusing authenticated state between unrelated organizations —
 * there is no `storageState` option here, by design.
 */
export async function withBrowserContext<T>(
  options: BrowserManagerOptions,
  fn: (context: BrowserContext) => Promise<T>,
): Promise<T> {
  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: options.headless });
  } catch (error) {
    throw new Error(`Failed to launch Chromium: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    let context: BrowserContext;
    try {
      context = await browser.newContext();
    } catch (error) {
      throw new Error(`Failed to create an isolated browser context: ${error instanceof Error ? error.message : String(error)}`);
    }

    context.setDefaultNavigationTimeout(options.navigationTimeoutMs);
    context.setDefaultTimeout(options.navigationTimeoutMs);

    try {
      return await fn(context);
    } finally {
      await context.close().catch(() => {
        // Best-effort — the outer browser.close() below still cleans up everything regardless.
      });
    }
  } finally {
    await browser.close().catch(() => {
      // Best-effort — a browser that failed to close cleanly (e.g. it already crashed) shouldn't itself fail the run; the OS reclaims the process either way.
    });
  }
}
