import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type BrowserContext } from 'playwright';

import { installRouteGuard } from '../route-guard';

async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const path = req.url ?? '/';
    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<html><body>' +
          '<img id="ok" src="/pixel.png">' +
          '<img id="private" src="http://169.254.169.254/latest/meta-data/">' +
          '</body></html>',
      );
    } else if (path === '/pixel.png') {
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    } else if (path === '/redirect-to-external') {
      res.writeHead(302, { location: 'http://evil.example.com/' });
      res.end();
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

describe('installRouteGuard', () => {
  let fixture: { url: string; close: () => Promise<void> };
  let browser: Browser;
  let context: BrowserContext;

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

  it('allows a same-origin navigation and its same-origin sub-resources', async () => {
    context = await browser.newContext();
    installRouteGuard(context, new URL(fixture.url));
    const page = await context.newPage();

    const response = await page.goto(`${fixture.url}/`, { waitUntil: 'load' });
    expect(response?.ok()).toBe(true);
  });

  it('blocks a sub-resource request aimed at a blocked private/link-local address (SSRF)', async () => {
    context = await browser.newContext();
    installRouteGuard(context, new URL(fixture.url));
    const page = await context.newPage();

    const blockedRequests: string[] = [];
    page.on('requestfailed', (request) => blockedRequests.push(request.url()));

    await page.goto(`${fixture.url}/`, { waitUntil: 'load' });
    // Give the intercepted (and aborted) sub-resource request a moment to surface as 'requestfailed'.
    await page.waitForTimeout(200);

    expect(blockedRequests.some((url) => url.includes('169.254.169.254'))).toBe(true);
  });

  it('blocks navigation to a different origin', async () => {
    context = await browser.newContext();
    installRouteGuard(context, new URL(fixture.url));
    const page = await context.newPage();

    await expect(page.goto('http://evil.example.com/', { waitUntil: 'load', timeout: 5_000 })).rejects.toThrow();
  });

  it('blocks a redirect that leaves the allowed origin', async () => {
    context = await browser.newContext();
    installRouteGuard(context, new URL(fixture.url));
    const page = await context.newPage();

    await expect(
      page.goto(`${fixture.url}/redirect-to-external`, { waitUntil: 'load', timeout: 5_000 }),
    ).rejects.toThrow();
  });
});
