import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

import { runPageCheck } from '../run-page-check';

/**
 * A tiny local fixture server so every test is hermetic — this sandbox has
 * no route to a real external host, and the codebase's established pattern
 * (see browser-manager.test.ts) is a local `node:http` server rather than
 * mocking Playwright itself.
 */
async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const path = req.url ?? '/';
    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>Home</title></head><body><a href="/about">About</a></body></html>');
    } else if (path === '/about') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>About</title></head><body>About page</body></html>');
    } else if (path === '/broken') {
      res.writeHead(500, { 'content-type': 'text/html' });
      res.end('<html><head><title>Broken</title></head><body>Server error</body></html>');
    } else if (path === '/console-error') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>Console Error</title></head><body><script>console.error("boom");console.warn("careful");</script></body></html>');
    } else if (path === '/network-error') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<html><head><title>Network Error</title></head><body><script>fetch("http://127.0.0.1:1/nope").catch(() => {});</script></body></html>',
      );
    } else if (path === '/missing-asset') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><head><title>Missing Asset</title></head><body><img src="/does-not-exist.png"></body></html>');
    } else {
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end('not found');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const OPTIONS = { navigationTimeoutMs: 10_000 };

describe('runPageCheck', () => {
  let fixture: { url: string; close: () => Promise<void> };
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    fixture = await startFixtureServer();
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
    await fixture.close();
  });

  afterEach(async () => {
    await context.close();
  });

  async function newPage(): Promise<Page> {
    context = await browser.newContext();
    page = await context.newPage();
    return page;
  }

  it('passes for a healthy page and reports its title, status and a screenshot artifact', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, `${fixture.url}/`, OPTIONS);

    expect(outcome.status).toBe('passed');
    expect(outcome.errorMessage).toBeNull();
    expect(outcome.httpStatus).toBe(200);
    expect(outcome.title).toBe('Home');
    expect(outcome.artifacts.find((a) => a.kind === 'screenshot')).toBeDefined();
    expect(outcome.artifacts.find((a) => a.kind === 'json_report')).toBeDefined();
  });

  it('discovers the raw hrefs found on the page', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, `${fixture.url}/`, OPTIONS);

    expect(outcome.discoveredHrefs).toContain('/about');
  });

  it('fails when the main document responds with a server error', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, `${fixture.url}/broken`, OPTIONS);

    expect(outcome.status).toBe('failed');
    expect(outcome.httpStatus).toBe(500);
    expect(outcome.errorMessage).toMatch(/500/);
  });

  it('fails when navigation itself errors out (unreachable host)', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, 'http://127.0.0.1:1/', OPTIONS);

    expect(outcome.status).toBe('failed');
    expect(outcome.httpStatus).toBeNull();
    expect(outcome.errorMessage).toMatch(/Navigation failed/);
  });

  it('records a console error as evidence without failing the check by default', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, `${fixture.url}/console-error`, OPTIONS);

    expect(outcome.status).toBe('passed');
    expect(outcome.evidence.consoleErrors).toContain('boom');
    expect(outcome.evidence.consoleWarnings).toContain('careful');
  });

  it('fails a check with console errors when failOnConsoleError is enabled', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, `${fixture.url}/console-error`, { ...OPTIONS, failOnConsoleError: true });

    expect(outcome.status).toBe('failed');
    expect(outcome.errorMessage).toMatch(/console error/);
  });

  it('records a failed network request as evidence without failing the check', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, `${fixture.url}/network-error`, OPTIONS);

    expect(outcome.status).toBe('passed');
    expect(outcome.evidence.networkFailures.length).toBeGreaterThan(0);
    expect(outcome.evidence.networkFailures[0]?.url).toContain('127.0.0.1:1');
  });

  it('records a sub-resource error response as evidence without failing the check', async () => {
    const p = await newPage();
    const outcome = await runPageCheck(p, `${fixture.url}/missing-asset`, OPTIONS);

    expect(outcome.status).toBe('passed');
    expect(outcome.evidence.subResourceErrorResponses).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 404 })]),
    );
  });

  it('respects the navigation timeout and reports it as a failure', async () => {
    const hanging: Server = createServer(() => {
      // Never responds.
    });
    await new Promise<void>((resolve) => hanging.listen(0, '127.0.0.1', resolve));
    const address = hanging.address() as AddressInfo;

    try {
      const p = await newPage();
      const outcome = await runPageCheck(p, `http://127.0.0.1:${address.port}/`, { navigationTimeoutMs: 200 });

      expect(outcome.status).toBe('failed');
      expect(outcome.errorMessage).toMatch(/Navigation failed/);
    } finally {
      // The browser's TCP connection to the hanging server is still open (goto only gave up
      // waiting — it never tore down the socket), so a plain server.close() would itself hang
      // until that connection ends. Force it closed rather than waiting for the client.
      await new Promise<void>((resolve) => {
        hanging.close(() => resolve());
        hanging.closeAllConnections();
      });
    }
  });
});
