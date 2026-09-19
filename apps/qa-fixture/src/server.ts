import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';

import {
  ABOUT_PAGE,
  APP_ABOUT_PAGE,
  APP_PAGE,
  BROKEN_PAGE,
  CONSOLE_ERROR_PAGE,
  CONTACT_PAGE,
  loginPage,
  NETWORK_ERROR_PAGE,
  NOT_FOUND_PAGE,
  otpPage,
} from './pages';

/**
 * Fixture-only test values — deliberately not real secrets, never used
 * against any real system. Exist so the auth flow below is genuinely
 * deterministic: the same credential and code always succeed, so tests
 * (and PlaywrightTestExecutor's own dev-time smoke checks) never depend on
 * a real email inbox or a real password. See docs/authentication-qa.md.
 */
const TEST_EMAIL = 'fixture-user@example.com';
const TEST_PASSWORD = 'fixture-test-password';
const TEST_OTP_CODE = '123456';

const PENDING_COOKIE = 'qa_fixture_pending';
const SESSION_COOKIE = 'qa_fixture_session';

function sendHtml(res: ServerResponse, status: number, body: string, cookies?: string[]): void {
  const headers: Record<string, string | string[]> = { 'content-type': 'text/html; charset=utf-8' };
  if (cookies) headers['set-cookie'] = cookies;
  res.writeHead(status, headers);
  res.end(body);
}

function redirect(res: ServerResponse, location: string, cookies?: string[]): void {
  const headers: Record<string, string | string[]> = { location };
  if (cookies) headers['set-cookie'] = cookies;
  res.writeHead(302, headers);
  res.end();
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (!name) continue;
    cookies[name] = decodeURIComponent(rest.join('='));
  }
  return cookies;
}

async function readFormBody(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  const fields: Record<string, string> = {};
  for (const pair of new URLSearchParams(raw)) {
    fields[pair[0]] = pair[1];
  }
  return fields;
}

function isAuthenticated(req: IncomingMessage): boolean {
  return parseCookies(req)[SESSION_COOKIE] === 'authenticated';
}

function isPendingOtp(req: IncomingMessage): boolean {
  return parseCookies(req)[PENDING_COOKIE] === 'otp-pending';
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const path = (req.url ?? '/').split('?')[0];
  const method = req.method ?? 'GET';

  switch (path) {
    case '/':
      // Mirrors MizaniyaPay's real shape: an unauthenticated visitor is
      // redirected straight to the login boundary, never shown app content.
      redirect(res, isAuthenticated(req) ? '/app' : '/auth/login');
      return;

    case '/auth/login':
      if (method === 'POST') {
        const fields = await readFormBody(req);
        if (fields.email === TEST_EMAIL && fields.password === TEST_PASSWORD) {
          redirect(res, '/auth/otp', [`${PENDING_COOKIE}=otp-pending; Path=/; HttpOnly`]);
        } else {
          sendHtml(res, 401, loginPage('Invalid email or password.'));
        }
        return;
      }
      sendHtml(res, 200, loginPage());
      return;

    case '/auth/otp':
      if (method === 'POST') {
        if (!isPendingOtp(req)) {
          redirect(res, '/auth/login');
          return;
        }
        const fields = await readFormBody(req);
        if (fields.code === TEST_OTP_CODE) {
          // Clears the pending cookie and grants the session cookie in the same response.
          redirect(res, '/app', [
            `${PENDING_COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
            `${SESSION_COOKIE}=authenticated; Path=/; HttpOnly`,
          ]);
        } else {
          sendHtml(res, 401, otpPage('Incorrect code.'));
        }
        return;
      }
      if (!isPendingOtp(req)) {
        redirect(res, '/auth/login');
        return;
      }
      sendHtml(res, 200, otpPage());
      return;

    case '/app':
      if (!isAuthenticated(req)) {
        redirect(res, '/auth/login');
        return;
      }
      sendHtml(res, 200, APP_PAGE);
      return;

    case '/app/about':
      if (!isAuthenticated(req)) {
        redirect(res, '/auth/login');
        return;
      }
      sendHtml(res, 200, APP_ABOUT_PAGE);
      return;

    case '/about':
      sendHtml(res, 200, ABOUT_PAGE);
      return;
    case '/contact':
      sendHtml(res, 200, CONTACT_PAGE);
      return;
    case '/broken':
      sendHtml(res, 500, BROKEN_PAGE);
      return;
    case '/console-error':
      sendHtml(res, 200, CONSOLE_ERROR_PAGE);
      return;
    case '/network-error':
      sendHtml(res, 200, NETWORK_ERROR_PAGE);
      return;
    default:
      sendHtml(res, 404, NOT_FOUND_PAGE);
      return;
  }
}

/** Exported separately from `index.ts`'s `listen()` call so tests can create and tear down a server without going through a fixed port. */
export function createFixtureServer(): Server {
  return createServer((req, res) => {
    void handleRequest(req, res);
  });
}
