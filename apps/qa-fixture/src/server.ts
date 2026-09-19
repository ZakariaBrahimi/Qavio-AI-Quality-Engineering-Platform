import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';

import {
  ABOUT_PAGE,
  BROKEN_PAGE,
  CONSOLE_ERROR_PAGE,
  CONTACT_PAGE,
  HOME_PAGE,
  NETWORK_ERROR_PAGE,
  NOT_FOUND_PAGE,
} from './pages';

function sendHtml(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const path = (req.url ?? '/').split('?')[0];

  switch (path) {
    case '/':
      sendHtml(res, 200, HOME_PAGE);
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
  return createServer(handleRequest);
}
