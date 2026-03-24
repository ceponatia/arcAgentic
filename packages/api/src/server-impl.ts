import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { createLogger } from '@arcagentic/logger';

import { loadData } from './loaders/loader.js';
import type { ApiError } from './types.js';
import type { LoadedData } from './loaders/types.js';
import { getConfig } from './utils/config.js';
import { getEnvCsv, getEnvValue } from './utils/env.js';
import {
  ensureLocalAdminUser,
  initStudioSessionsTable,
  cleanupExpiredSessions,
} from '@arcagentic/db/node';

// Route registrars
import { registerSystemRoutes } from './routes/system/index.js';
import { registerAdminRoutes } from './routes/admin/index.js';
import { registerGameRoutes } from './routes/game/index.js';
import { registerUserRoutes } from './routes/users/index.js';
import { registerResourceRoutes } from './routes/resources/index.js';
import { registerStudioRoutes } from './routes/studio.js';
import { registerSensoryRoutes } from './routes/sensory.js';
import streamRouter from './routes/stream.js';
import { attachAuthUser, requireAuthIfEnabled } from './auth/middleware.js';
import {
  worldBus,
  redis,
  telemetryMiddleware,
  persistenceMiddleware,
  registerPersistenceHandler,
} from '@arcagentic/bus';
import { persistWorldEvent } from './services/event-persistence.js';
import { rulesEngine, Scheduler, tickEmitter } from '@arcagentic/services';
import { initRateLimiterRedis } from './middleware/rate-limiter.js';
import { requestLogger } from './middleware/request-logger.js';

const app = new Hono();
const log = createLogger('api', 'server');

function initializeWorldBus(): void {
  worldBus.use(telemetryMiddleware);
  worldBus.use(persistenceMiddleware);
  registerPersistenceHandler(persistWorldEvent);
  log.info('world bus persistence initialized');
}

app.onError((err, c) => {
  log.error(
    {
      err,
      method: c.req.method,
      path: c.req.path,
    },
    'unhandled server error'
  );
  const message =
    err && typeof err === 'object' && 'message' in err
      ? ((err as { message?: string }).message ?? 'Server error')
      : 'Server error';
  const body: ApiError = { ok: false, error: message };
  return c.json(body, 500);
});

// Loaded data lives here; routes access it via a getter
let loaded: LoadedData | undefined = undefined;

export async function startServer(): Promise<void> {
  try {
    initializeWorldBus();
    initRateLimiterRedis(redis);
    rulesEngine.start();
    Scheduler.start();
    tickEmitter.start(5000);

    // Initialize studio sessions table if not already present
    await initStudioSessionsTable();
    await cleanupExpiredSessions();

    // Load character + setting JSON from data/
    loaded = await loadData();
    log.info(
      {
        characterCount: loaded.characters.length,
        settingCount: loaded.settings.length,
      },
      'startup data loaded'
    );

    // Local/dev bootstrap: if LOCAL_ADMIN_PASSWORD is provided, ensure an admin user exists.
    const localAdminPassword = getEnvValue('LOCAL_ADMIN_PASSWORD');
    if (localAdminPassword && localAdminPassword.trim().length > 0) {
      await ensureLocalAdminUser({ password: localAdminPassword });
      log.info({ identifier: 'admin' }, 'ensured local admin user');
    }
  } catch (err) {
    log.error({ err }, 'failed to load startup data');
    process.exit(1);
  }

  const cfg = getConfig();
  log.info(
    {
      port: cfg.port,
      contextWindow: cfg.contextWindow,
      temperature: cfg.temperature,
      topP: cfg.topP,
      openrouterModel: cfg.openrouterModel,
      openrouterApiKeySet: Boolean(cfg.openrouterApiKey),
    },
    'runtime config'
  );

  // Enable CORS for browser-based clients (Vite dev, etc.)
  const corsOrigins = getEnvCsv('CORS_ORIGINS');

  app.use(
    '*',
    cors({
      origin: corsOrigins.length > 0 ? corsOrigins : '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use('*', requestLogger);

  // Attach auth user (if any) from Authorization header
  app.use('*', attachAuthUser);

  // Require auth for non-public routes when enabled
  app.use('*', requireAuthIfEnabled);

  // Register route groups
  registerSystemRoutes(app);
  registerAdminRoutes(app);
  registerUserRoutes(app, { getLoaded: (): LoadedData | undefined => loaded });
  registerGameRoutes(app, { getLoaded: (): LoadedData | undefined => loaded });
  registerResourceRoutes(app);
  registerStudioRoutes(app);
  registerSensoryRoutes(app);
  app.route('/stream', streamRouter);

  const port = cfg.port;
  const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
  log.info({ host: '0.0.0.0', port }, 'api server listening');

  const shutdown = async (): Promise<void> => {
    log.info('shutting down gracefully');
    tickEmitter.stop();

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        log.warn('shutdown timeout reached; forcing exit');
        resolve();
      }, 10_000);

      server.close(() => {
        clearTimeout(timeout);
        resolve();
      });
    });

    log.info('shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT', () => { void shutdown(); });
}
