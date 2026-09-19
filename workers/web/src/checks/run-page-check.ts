import type { ConsoleMessage, Page, Request, Response } from 'playwright';

/**
 * One page's deterministic functional check: navigate, record factual
 * evidence (HTTP status, console errors/warnings, failed sub-resource
 * requests, uncaught page errors), capture a screenshot, and extract the
 * page's same-origin links for the crawler to consume next. This module
 * never clicks anything and never asserts business logic — see
 * docs/test-run-engine.md's "Deterministic functional checks" section for
 * why Phase 7 stays factual ("this console error occurred") rather than
 * diagnostic ("this is a bug").
 */

export interface PageCheckOptions {
  navigationTimeoutMs: number;
  /** Off by default — a console error becomes evidence, not a failure, unless a run's configuration explicitly opts in. Network sub-resource failures never fail the check; they're evidence only. */
  failOnConsoleError?: boolean;
}

/**
 * Upper bound on the extra wait for the page to actually render after
 * `domcontentloaded` fires (see the `waitForLoadState('networkidle', …)`
 * call below) — deliberately short and deterministic, not a long fixed
 * sleep: most SPAs settle in well under this; a page that never goes
 * network-idle (persistent polling, analytics beacons) just proceeds to
 * the screenshot once this elapses, exactly as it would have before this
 * wait existed. Bounded so one slow page can't meaningfully extend a
 * 15-page crawl's total duration.
 */
const RENDER_SETTLE_TIMEOUT_MS = 3_000;

export interface NetworkFailure {
  url: string;
  method: string;
  failure: string;
}

export interface HttpErrorResponse {
  url: string;
  status: number;
}

export interface PageCheckEvidence {
  consoleErrors: string[];
  consoleWarnings: string[];
  networkFailures: NetworkFailure[];
  /** Non-2xx/3xx responses to *sub-resources* (scripts, images, XHR/fetch) — the main document's own status is reported separately as `httpStatus`. */
  subResourceErrorResponses: HttpErrorResponse[];
  pageErrors: string[];
}

export interface PageCheckArtifact {
  kind: 'screenshot' | 'json_report';
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface PageCheckOutcome {
  status: 'passed' | 'failed';
  errorMessage: string | null;
  durationMs: number;
  httpStatus: number | null;
  title: string | null;
  /** The page's actual URL after navigation (post-redirect) — `null` if navigation itself failed. Relative links found on the page must resolve against this, not the originally-requested URL, since a redirect can land somewhere with a different path. */
  finalUrl: string | null;
  /** Same-origin filtering, normalization and dedup are the crawler's job (see crawler/discover-links.ts) — this is just the raw `href` attribute values found on the page. */
  discoveredHrefs: string[];
  evidence: PageCheckEvidence;
  artifacts: PageCheckArtifact[];
}

/** Turns a URL into a filesystem/storage-safe filename fragment, e.g. `https://x.com/about?x=1` -> `about`. */
function slugifyUrl(url: string): string {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url;
  }
  const slug = pathname.replace(/^\/|\/$/g, '').replace(/[^a-zA-Z0-9-_]+/g, '-');
  return slug.length > 0 ? slug : 'root';
}

export async function runPageCheck(page: Page, url: string, options: PageCheckOptions): Promise<PageCheckOutcome> {
  const startedAt = Date.now();
  const slug = slugifyUrl(url);

  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const networkFailures: NetworkFailure[] = [];
  const subResourceErrorResponses: HttpErrorResponse[] = [];
  const pageErrors: string[] = [];

  const onConsole = (message: ConsoleMessage): void => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    else if (message.type() === 'warning') consoleWarnings.push(message.text());
  };
  const onRequestFailed = (request: Request): void => {
    networkFailures.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText ?? 'unknown failure' });
  };
  const onResponse = (response: Response): void => {
    if (response.status() >= 400 && response.request().resourceType() !== 'document') {
      subResourceErrorResponses.push({ url: response.url(), status: response.status() });
    }
  };
  const onPageError = (error: Error): void => {
    pageErrors.push(error.message);
  };

  page.on('console', onConsole);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);
  page.on('pageerror', onPageError);

  try {
    let httpStatus: number | null = null;
    let title: string | null = null;
    let finalUrl: string | null = null;
    let discoveredHrefs: string[] = [];
    let failureReason: string | null = null;
    /** Distinguishes "navigation completed, but the response was 4xx/5xx" (the page rendered — safe to inspect/screenshot) from "goto itself threw" (no page ever loaded — Chromium can hang for tens of seconds if a screenshot is attempted against a still-navigating page, see run-page-check.test.ts). */
    let navigated = false;

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: options.navigationTimeoutMs });
      navigated = true;
      httpStatus = response?.status() ?? null;
      if (!response || !response.ok()) {
        failureReason = `Unexpected response status: ${httpStatus ?? 'no response'}`;
      }
    } catch (error) {
      failureReason = `Navigation failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    if (navigated) {
      finalUrl = page.url();

      // `domcontentloaded` fires as soon as the initial HTML parses — for a
      // client-rendered SPA (React/Vue/etc.), that's often still just an
      // empty root <div>, before the framework has mounted and painted
      // anything. Give the page a short, bounded chance to settle before
      // reading its title/links or taking the evidence screenshot, so
      // those reflect what a user would actually see rather than a blank
      // shell. Never fatal — a page that keeps the network busy forever
      // (polling, analytics) just proceeds once the timeout elapses.
      try {
        await page.waitForLoadState('networkidle', { timeout: RENDER_SETTLE_TIMEOUT_MS });
      } catch {
        // Timed out waiting for network idle — proceed with whatever rendered so far.
      }

      try {
        title = await page.title();
      } catch {
        // Page may have navigated away or closed mid-check — not fatal, just leave title unknown.
      }

      try {
        discoveredHrefs = await page.$$eval('a[href]', (anchors) =>
          anchors.map((a) => a.getAttribute('href') ?? '').filter((href) => href.length > 0),
        );
      } catch {
        // Non-fatal — link discovery is best-effort; the check itself already succeeded.
      }

      if (options.failOnConsoleError && consoleErrors.length > 0) {
        failureReason = `${consoleErrors.length} console error(s) occurred: ${consoleErrors[0]}`;
      }
    }

    const artifacts: PageCheckArtifact[] = [];
    if (navigated) {
      try {
        const screenshot = await page.screenshot({ fullPage: false, timeout: options.navigationTimeoutMs });
        artifacts.push({ kind: 'screenshot', filename: `${slug}.png`, contentType: 'image/png', data: screenshot });
      } catch {
        // Non-fatal — a screenshot is evidence, not the check itself; a failed capture shouldn't mask the real result.
      }
    }

    const evidence: PageCheckEvidence = { consoleErrors, consoleWarnings, networkFailures, subResourceErrorResponses, pageErrors };
    artifacts.push({
      kind: 'json_report',
      filename: `${slug}.json`,
      contentType: 'application/json',
      data: Buffer.from(JSON.stringify({ url, httpStatus, title, evidence }, null, 2)),
    });

    return {
      status: failureReason ? 'failed' : 'passed',
      errorMessage: failureReason,
      durationMs: Date.now() - startedAt,
      httpStatus,
      title,
      finalUrl,
      discoveredHrefs,
      evidence,
      artifacts,
    };
  } finally {
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
    page.off('pageerror', onPageError);
  }
}
