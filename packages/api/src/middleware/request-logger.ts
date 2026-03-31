import { randomUUID } from 'node:crypto';
import { createLogger } from '@arcagentic/logger';
import type { MiddlewareHandler } from 'hono';

const log = createLogger('api', 'http');

const isLowNoiseRequestPath = (path: string): boolean =>
  path.endsWith('/heartbeat') || path.endsWith('/disconnect');

/**
 * Middleware that logs incoming requests and outgoing responses with timing and correlation IDs.
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = randomUUID();
  c.set('requestId', requestId);

  const start = performance.now();
  const method = c.req.method;
  const path = c.req.path;
  const isLowNoiseRequest = isLowNoiseRequestPath(path);

  if (isLowNoiseRequest) {
    log.debug({ requestId, method, path }, 'request started');
  } else {
    log.info({ requestId, method, path }, 'request started');
  }

  await next();

  const duration = Math.round(performance.now() - start);
  const status = c.res.status;

  if (status >= 500) {
    log.error({ requestId, method, path, status, duration }, 'request completed');
    return;
  }

  if (status >= 400) {
    log.warn({ requestId, method, path, status, duration }, 'request completed');
    return;
  }

  if (isLowNoiseRequest) {
    log.debug({ requestId, method, path, status, duration }, 'request completed');
    return;
  }

  log.info({ requestId, method, path, status, duration }, 'request completed');
};
