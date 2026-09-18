import type { Page } from 'playwright';

export interface PageCheckResult {
  status: 'passed' | 'failed';
  durationMs: number;
  title: string | null;
  errorMessage: string | null;
}

/**
 * The smallest possible functional check: does the page load and respond
 * with a 2xx/3xx status. This is intentionally minimal — the real QA
 * engine (assertions, multi-step flows, visual/responsive checks) is out
 * of scope for Phase 1.
 */
export async function runBasicPageCheck(page: Page, url: string): Promise<PageCheckResult> {
  const startedAt = Date.now();

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    const durationMs = Date.now() - startedAt;

    if (!response || !response.ok()) {
      return {
        status: 'failed',
        durationMs,
        title: null,
        errorMessage: `Unexpected response status: ${response?.status() ?? 'no response'}`,
      };
    }

    return { status: 'passed', durationMs, title: await page.title(), errorMessage: null };
  } catch (error) {
    return {
      status: 'failed',
      durationMs: Date.now() - startedAt,
      title: null,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
