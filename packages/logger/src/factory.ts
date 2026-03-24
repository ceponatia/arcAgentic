import pino, { type Logger } from 'pino';

const LOG_LEVEL = process.env['LOG_LEVEL'] ?? (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug');

const baseLogger: Logger = pino({
  level: LOG_LEVEL,
  ...(process.env['NODE_ENV'] !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});

/**
 * Create a package-scoped logger.
 *
 * @param pkg - Package name (e.g. 'api', 'bus', 'services')
 * @param subsystem - Optional subsystem within the package (e.g. 'http', 'redis', 'scheduler')
 */
export function createLogger(pkg: string, subsystem?: string): Logger {
  return baseLogger.child({
    pkg,
    ...(subsystem ? { sub: subsystem } : {}),
  });
}
