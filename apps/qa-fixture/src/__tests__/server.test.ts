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

  it('redirects / to the authentication boundary rather than serving app content directly', async () => {
    const response = await fetch(`${baseUrl}/`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/auth/login');
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

describe('qa-fixture server — authentication flow', () => {
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

  it('redirects an unauthenticated visitor from / to /auth/login', async () => {
    const response = await fetch(`${baseUrl}/`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/auth/login');
  });

  it('redirects an unauthenticated request for /app to /auth/login', async () => {
    const response = await fetch(`${baseUrl}/app`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/auth/login');
  });

  it('rejects incorrect credentials with a visible error, not a redirect', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=wrong@example.com&password=wrong',
    });
    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toMatch(/invalid/i);
  });

  it('completes the full email+password -> OTP -> authenticated app flow deterministically', async () => {
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=fixture-user@example.com&password=fixture-test-password',
      redirect: 'manual',
    });
    expect(loginResponse.status).toBe(302);
    expect(loginResponse.headers.get('location')).toBe('/auth/otp');
    const pendingCookie = loginResponse.headers.get('set-cookie');
    expect(pendingCookie).toMatch(/qa_fixture_pending=otp-pending/);

    const otpResponse = await fetch(`${baseUrl}/auth/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: 'qa_fixture_pending=otp-pending' },
      body: 'code=123456',
      redirect: 'manual',
    });
    expect(otpResponse.status).toBe(302);
    expect(otpResponse.headers.get('location')).toBe('/app');
    const sessionCookie = otpResponse.headers.get('set-cookie');
    expect(sessionCookie).toMatch(/qa_fixture_session=authenticated/);

    const appResponse = await fetch(`${baseUrl}/app`, { headers: { cookie: 'qa_fixture_session=authenticated' } });
    expect(appResponse.status).toBe(200);
    const appBody = await appResponse.text();
    expect(appBody).toContain('You are signed in');
    expect(appBody).toContain('href="/app/about"');
  });

  it('rejects an incorrect OTP code without granting a session', async () => {
    const response = await fetch(`${baseUrl}/auth/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: 'qa_fixture_pending=otp-pending' },
      body: 'code=000000',
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('redirects to /auth/login when submitting an OTP code without a pending login', async () => {
    const response = await fetch(`${baseUrl}/auth/otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'code=123456',
      redirect: 'manual',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/auth/login');
  });
});
