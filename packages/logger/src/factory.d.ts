import { type Logger } from 'pino';
/**
 * Create a package-scoped logger.
 *
 * @param pkg - Package name (e.g. 'api', 'bus', 'services')
 * @param subsystem - Optional subsystem within the package (e.g. 'http', 'redis', 'scheduler')
 */
export declare function createLogger(pkg: string, subsystem?: string): Logger;
//# sourceMappingURL=factory.d.ts.map