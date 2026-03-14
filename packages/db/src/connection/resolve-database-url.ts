import type { DatabaseConnectionInfo } from './types.js';

/**
 * Resolve the Postgres connection string to use for this process.
 *
 * Rules:
 * - If `DB_TARGET=local`, prefer `DATABASE_URL_LOCAL`, else fall back to a safe local default.
 * - Otherwise (default), use `DATABASE_URL` if set, else fall back to the local default.
 */
export function resolveDatabaseUrl(
  env: Record<string, string | undefined>
): DatabaseConnectionInfo {
  const target = (env['DB_TARGET'] ?? '').trim().toLowerCase();

  if (target === 'local') {
    if (env['DATABASE_URL_LOCAL']) {
      return {
        url: env['DATABASE_URL_LOCAL'],
        source: 'DATABASE_URL_LOCAL',
      };
    }
    throw new Error('DB_TARGET=local but DATABASE_URL_LOCAL is not defined');
  }

  if (env['DATABASE_URL']) {
    return { url: env['DATABASE_URL'], source: 'DATABASE_URL' };
  }

  if (env['DATABASE_URL_LOCAL']) {
    return { url: env['DATABASE_URL_LOCAL'], source: 'DATABASE_URL_LOCAL' };
  }

  throw new Error('No database URL found (checked DATABASE_URL, DATABASE_URL_LOCAL)');
}
