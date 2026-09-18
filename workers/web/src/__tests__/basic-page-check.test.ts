import { createServer, type Server } from 'node:http';

import { type Browser, chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runBasicPageCheck } from '../checks/basic-page-check';

describe('runBasicPageCheck', () => {
  let browser: Browser;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    browser = await chromium.launch();

    server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<title>Qavio</title><h1>OK</h1>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${port}/`;
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('passes for a page that loads successfully', async () => {
    const page = await browser.newPage();
    const result = await runBasicPageCheck(page, baseUrl);

    expect(result.status).toBe('passed');
    expect(result.title).toBe('Qavio');
    await page.close();
  });

  it('fails for a URL that cannot be reached', async () => {
    const page = await browser.newPage();
    const result = await runBasicPageCheck(page, 'http://127.0.0.1:1');

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBeTruthy();
    await page.close();
  });
});
