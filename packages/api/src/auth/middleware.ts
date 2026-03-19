import type { Context, Next } from 'hono';
import type { ApiError } from '../types.js';
import type { AuthUser } from './types.js';
import { getAuthSecret, verifyAuthToken } from './token.js';
import { getEnvCsv, getEnvFlag, getEnvValue } from '../utils/env.js';

const AUTH_CONTEXT_KEY = 'authUser';

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice('bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function getAuthUser(c: Context): AuthUser | null {
  const existing = c.get(AUTH_CONTEXT_KEY as never) as AuthUser | undefined;
  return existing ?? null;
}

export async function attachAuthUser(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header('Authorization') ?? null;
  const token = parseBearerToken(authHeader);

  const debugAuth = getEnvFlag('DEBUG_AUTH');

  if (debugAuth) {
    console.info('[auth] attachAuthUser', {
      method: c.req.method,
      path: c.req.path,
      hasAuthorizationHeader: Boolean(authHeader),
      hasBearerToken: Boolean(token),
    });
  }

  if (token) {
    const secret = getAuthSecret();
    if (secret) {
      const verified = verifyAuthToken(token, secret);
      if (verified.ok) {
        c.set(AUTH_CONTEXT_KEY as never, {
          identifier: verified.payload.sub,
          role: verified.payload.role,
          email: null,
        } satisfies AuthUser);
        if (debugAuth) {
          console.info('[auth] Local auth token verified', {
            identifier: verified.payload.sub,
            role: verified.payload.role,
          });
        }
      }
    } else if (debugAuth) {
      console.warn('[auth] Local auth secret missing (AUTH_SECRET)');
    }
  }

  // Bypass auth if configured (dev only)
  if (getEnvFlag('BYPASS_AUTH')) {
    if (isBypassAuthAllowed()) {
      c.set(AUTH_CONTEXT_KEY as never, {
        identifier: 'dev-admin',
        role: 'admin',
        email: 'admin@example.com',
      } satisfies AuthUser);
    } else {
      console.warn(
        '[auth] BYPASS_AUTH is set but NODE_ENV is not "development". Auth bypass is disabled in non-development environments.'
      );
    }
  }

  await next();
}

function isBypassAuthAllowed(): boolean {
  const nodeEnv = getEnvValue('NODE_ENV');
  return !nodeEnv || nodeEnv === 'development';
}

function isAuthRequired(): boolean {
  if (getEnvFlag('BYPASS_AUTH') && isBypassAuthAllowed()) {
    return false;
  }

  return getEnvFlag('AUTH_REQUIRED');
}

function isInviteOnly(): boolean {
  return getEnvFlag('INVITE_ONLY');
}

function getInviteEmails(): Set<string> {
  return new Set(getEnvCsv('INVITE_EMAILS').map((email) => email.toLowerCase()));
}

function isPublicPath(path: string): boolean {
  if (path === '/' || path === '') return true;
  if (path === '/health' || path === '/hello' || path === '/config') return true;
  if (path.startsWith('/auth/')) return true;
  return false;
}

/**
 * Enforces auth for all non-public routes unless BYPASS_AUTH is explicitly enabled.
 *
 * Also optionally enforces invite-only access when INVITE_ONLY=true.
 */
export async function requireAuthIfEnabled(c: Context, next: Next): Promise<void | Response> {
  if (!isAuthRequired()) {
    await next();
    return;
  }

  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const path = c.req.path;
  if (isPublicPath(path)) {
    await next();
    return;
  }

  const user = getAuthUser(c);
  if (!user) {
    return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
  }

  if (isInviteOnly()) {
    const invited = getInviteEmails();
    const email = user.email ?? null;
    if (!email || !invited.has(email.toLowerCase())) {
      return c.json({ ok: false, error: 'Forbidden' } satisfies ApiError, 403);
    }
  }

  await next();
}

export async function requireAdmin(c: Context, next: Next): Promise<void | Response> {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({ ok: false, error: 'Unauthorized' } satisfies ApiError, 401);
  }

  if (user.role !== 'admin') {
    return c.json({ ok: false, error: 'Forbidden' } satisfies ApiError, 403);
  }

  await next();
}
