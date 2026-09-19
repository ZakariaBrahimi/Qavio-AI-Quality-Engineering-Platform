import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { chromium, type Browser, type BrowserContext } from 'playwright';

import type { TestExecutionContext } from '@qavio/queue';

import { PlaywrightTestExecutor, crawlSite, type CrawlLimits } from '../playwright-executor';

/** A tiny multi-page site: a home page linking to /about and /broken, a dead end at /about, and a page that always 500s — enough to exercise crawling, discovery, and a real per-page failure without any external network access. */
async function startFixtureSite(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const path = req.url ?? '/';
    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>Home</title></head><body><a href="/about">About</a><a href="/broken">Broken</a></body></html>');
    } else if (path === '/about') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>About</title></head><body>About page, no more links here.</body></html>');
    } else if (path === '/broken') {
      res.writeHead(500, { 'content-type': 'text/html' });
      res.end('<html><head><title>Broken</title></head><body>Server error</body></html>');
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function makeContext(overrides: Partial<TestExecutionContext> = {}): TestExecutionContext {
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

const FULL_LIMITS: CrawlLimits = { maxPages: 15, maxDepth: 2, maxDurationMs: 120_000, navigationTimeoutMs: 10_000, failOnConsoleError: false };

describe('PlaywrightTestExecutor.execute — target resolution and SSRF gate', () => {
  it('fails the run without launching a browser when the target fails SSRF validation', async () => {
    const executor = new PlaywrightTestExecutor({
      resolveTarget: async () => ({ baseUrl: 'http://169.254.169.254/' }),
      onProgress: vi.fn().mockResolvedValue(undefined),
      headless: true,
    });

    const result = await executor.execute(makeContext());

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/not allowed/i);
    expect(result.results).toEqual([]);
  });

  it('fails the run when the environment/project cannot be resolved', async () => {
    const executor = new PlaywrightTestExecutor({
      resolveTarget: async () => null,
      onProgress: vi.fn().mockResolvedValue(undefined),
      headless: true,
    });

    const result = await executor.execute(makeContext());

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/could not be found/i);
  });
});

/**
 * `crawlSite` is exercised directly (rather than through `execute`) for
 * everything below, since these tests need a real, un-mocked Chromium
 * pointed at a real HTTP server — and every address this sandbox can
 * actually bind a server to (127.0.0.1) is, correctly, one `execute`'s own
 * SSRF gate (`validateTargetUrl`, already covered above and exhaustively
 * in security/target-validation.test.ts) rejects. `crawlSite` takes an
 * already-validated origin, matching its one production caller.
 */
describe('crawlSite', () => {
  let fixture: { url: string; close: () => Promise<void> };
  let browser: Browser;
  let context: BrowserContext;

  beforeAll(async () => {
    fixture = await startFixtureSite();
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
    await fixture.close();
  });

  afterEach(async () => {
    await context.close();
  });

  it('crawls a real multi-page site end to end and reports a result per page with a screenshot artifact each', async () => {
    context = await browser.newContext();
    const onProgress = vi.fn().mockResolvedValue(undefined);

    const result = await crawlSite(context, new URL(fixture.url), FULL_LIMITS, new AbortController().signal, onProgress);

    // Home, About, Broken — discovered purely by following real <a href> links on real rendered pages.
    expect(result.results).toHaveLength(3);
    expect(result.results.every((r) => typeof r.id === 'string' && r.id.length > 0)).toBe(true);

    const byName = new Map(result.results.map((r) => [r.name, r]));
    expect(byName.get(`${fixture.url}/`)?.status).toBe('passed');
    expect(byName.get(`${fixture.url}/about`)?.status).toBe('passed');
    expect(byName.get(`${fixture.url}/broken`)?.status).toBe('failed');

    // The one failing page makes the whole run 'failed' — this is Phase 7's own aggregation, not a diagnosis of "which page has a bug" (that's what the per-result status is for).
    expect(result.status).toBe('failed');
    expect(result.summary).toEqual({ pagesChecked: 3, pagesPassed: 2, pagesFailed: 1, cancelled: false });

    const screenshotCount = result.artifacts?.filter((a) => a.kind === 'screenshot').length ?? 0;
    expect(screenshotCount).toBe(3);
    expect(onProgress).toHaveBeenCalled();
  }, 30_000);

  it('passes and produces no failing results when every discovered page is healthy', async () => {
    context = await browser.newContext();

    const result = await crawlSite(
      context,
      new URL(`${fixture.url}/about`),
      FULL_LIMITS,
      new AbortController().signal,
      vi.fn().mockResolvedValue(undefined),
    );

    expect(result.status).toBe('completed');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.status).toBe('passed');
  }, 30_000);

  it('respects maxPages and stops crawling once the limit is reached', async () => {
    context = await browser.newContext();

    const result = await crawlSite(
      context,
      new URL(fixture.url),
      { ...FULL_LIMITS, maxPages: 1 },
      new AbortController().signal,
      vi.fn().mockResolvedValue(undefined),
    );

    expect(result.results).toHaveLength(1);
  }, 30_000);

  it('stops promptly and reports cancellation when the signal is already aborted', async () => {
    context = await browser.newContext();
    const controller = new AbortController();
    controller.abort();

    const result = await crawlSite(context, new URL(fixture.url), FULL_LIMITS, controller.signal, vi.fn().mockResolvedValue(undefined));

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/cancelled/i);
    expect(result.summary).toMatchObject({ cancelled: true });
    expect(result.results).toEqual([]);
  }, 15_000);

  it('stops without finishing the crawl when the signal aborts once work is underway', async () => {
    context = await browser.newContext();
    const controller = new AbortController();

    const result = await crawlSite(context, new URL(fixture.url), FULL_LIMITS, controller.signal, async () => {
      // The first progress call fires once the crawl has already committed to checking the
      // home page — aborting here proves cancellation is honored *during* a run, not only
      // when the signal was already aborted before crawlSite was even called.
      controller.abort();
    });

    expect(result.status).toBe('failed');
    expect(result.summary).toMatchObject({ cancelled: true });
    // Cancellation caught it before all 3 pages of the fixture site were checked.
    expect(result.results.length).toBeLessThan(3);
  }, 15_000);
});
