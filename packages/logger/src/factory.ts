import pino, { type Logger } from 'pino';
import { LOG_LEVEL, PRETTY_TRANSPORT } from './config.js';

const baseLogger: Logger = pino({
  level: LOG_LEVEL,
  ...(PRETTY_TRANSPORT ? { transport: PRETTY_TRANSPORT } : {}),
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
