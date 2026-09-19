import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createFixtureServer } from '../server';

describe('qa-fixture server', () => {
  let baseUrl: string;
  let server: ReturnType<typeof createFixtureServer>;

  beforeAll(async () => {
    server = createFixtureServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('serves the home page with links to every other fixture page', async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('href="/about"');
    expect(body).toContain('href="/contact"');
    expect(body).toContain('href="/broken"');
    expect(body).toContain('href="/console-error"');
    expect(body).toContain('href="/network-error"');
  });

  it('serves a healthy /about page', async () => {
    const response = await fetch(`${baseUrl}/about`);
    expect(response.status).toBe(200);
  });

  it('serves a healthy /contact page', async () => {
    const response = await fetch(`${baseUrl}/contact`);
    expect(response.status).toBe(200);
  });

  it('responds with a server error on /broken', async () => {
    const response = await fetch(`${baseUrl}/broken`);
    expect(response.status).toBe(500);
  });

  it('serves /console-error with an inline script that logs to the console', async () => {
    const response = await fetch(`${baseUrl}/console-error`);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain('console.error');
  });

  it('serves /network-error with a failing sub-resource and a failing fetch', async () => {
    const response = await fetch(`${baseUrl}/network-error`);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain('this-image-does-not-exist.png');
    expect(body).toContain('fetch(');
  });

  it('responds with 404 for an unknown path', async () => {
    const response = await fetch(`${baseUrl}/nope`);
    expect(response.status).toBe(404);
  });
});
