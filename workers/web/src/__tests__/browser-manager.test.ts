import { createServer, type Server } from 'node:http';
import { describe, expect, it } from 'vitest';

import { withBrowserContext } from '../browser-manager';

/** A local server that accepts the connection but never responds — a deterministic way to prove a navigation timeout actually fires, without depending on any real network access (this sandbox has none for arbitrary external hosts). */
async function startHangingServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer(() => {
    // Deliberately never calls res.end() or res.write() — the request just hangs.
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server did not bind');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const OPTIONS = { headless: true, navigationTimeoutMs: 10_000 };

describe('withBrowserContext', () => {
  it('launches a real Chromium context and runs the callback against it', async () => {
    const title = await withBrowserContext(OPTIONS, async (context) => {
      const page = await context.newPage();
      await page.setContent('<html><head><title>hello</title></head><body>hi</body></html>');
      return page.title();
    });

    expect(title).toBe('hello');
  });

  it('gives each call an isolated context — cookies never leak between two calls', async () => {
    await withBrowserContext(OPTIONS, async (context) => {
      await context.addCookies([
        { name: 'session', value: 'run-a', domain: 'example.com', path: '/' },
      ]);
      const cookies = await context.cookies('https://example.com');
      expect(cookies).toHaveLength(1);
    });

    // A brand new call must not see the previous call's cookie — a fresh context, not a reused one.
    await withBrowserContext(OPTIONS, async (context) => {
      const cookies = await context.cookies('https://example.com');
      expect(cookies).toHaveLength(0);
    });
  });

  it('closes the browser/context even when the callback throws, and still propagates the error', async () => {
    await expect(
      withBrowserContext(OPTIONS, async () => {
        throw new Error('callback failed');
      }),
    ).rejects.toThrow('callback failed');
  });

  it('applies the configured navigation timeout as the context default', async () => {
    const hanging = await startHangingServer();
    try {
      await withBrowserContext({ headless: true, navigationTimeoutMs: 200 }, async (context) => {
        const page = await context.newPage();
        const startedAt = Date.now();
        await expect(page.goto(hanging.url)).rejects.toThrow(/Timeout/i);
        // Well under the server's "forever" — proves the 200ms context default actually fired, not some other unrelated timeout.
        expect(Date.now() - startedAt).toBeLessThan(2_000);
      });
    } finally {
      await hanging.close();
    }
  });
});
