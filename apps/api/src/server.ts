import Fastify from 'fastify';

import { healthRoutes } from './routes/health';

/**
 * Builds the Fastify app without starting a listener, so tests can exercise
 * routes with `app.inject()` instead of binding a real port.
 */
export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(healthRoutes);
  return app;
}
