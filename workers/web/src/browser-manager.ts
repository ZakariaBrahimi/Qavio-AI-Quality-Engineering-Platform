import { chromium, type Browser, type BrowserContext, type BrowserContextOptions } from 'playwright';

/** The object-shaped `storageState` (cookies + localStorage) — deliberately excludes the `string` (file path) variant `BrowserContextOptions` also allows: this worker never reads Playwright state off disk, only from a secret already fetched in memory. */
export type PlaywrightStorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

export interface BrowserManagerOptions {
  /** Server-side only — never a client-facing setting. Defaults to `true` for worker deployments; a developer can flip it locally to watch the browser run. */
  headless: boolean;
  navigationTimeoutMs: number;
  /**
   * A pre-authenticated Playwright `storageState` (cookies + localStorage),
   * resolved fresh per run from `environments.auth_credential_id` via
   * `get_credential_secret()` (see security/auth-context.ts) — never a
   * literal file path, never read from disk. Applied only to *this run's*
   * own fresh context, exactly once, and never written back anywhere: the
   * context (and whatever cookies/tokens end up in it) is destroyed in the
   * `finally` block below along with everything else. This is the one
   * piece of authenticated state `withBrowserContext` ever accepts, and it
   * never survives past the run that requested it.
   */
  storageState?: PlaywrightStorageState;
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
 * never reusing authenticated state between unrelated organizations. The
 * only way authenticated state ever enters a context is `options.storageState`,
 * applied fresh to this one call's own context and nowhere else — there is
 * still no mechanism here for one run's context to outlive `fn` or to be
 * reused by a later run.
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
      context = await browser.newContext(options.storageState ? { storageState: options.storageState } : {});
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
