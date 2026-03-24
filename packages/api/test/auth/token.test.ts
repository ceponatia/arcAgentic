import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loggerModule = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  },
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerModule.logger),
}));

import { signAuthToken, verifyAuthToken } from '../../src/auth/token.js';

function decodeBase64UrlJson<T>(value: string): T {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
}

describe('auth token helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('signs a JWT with the expected payload claims', () => {
    const payload = {
      sub: 'admin@example.com',
      role: 'admin' as const,
      iat: 1_774_353_600,
      exp: 1_774_357_200,
    };

    const token = signAuthToken(payload, 'test-secret');
    const parts = token.split('.');

    expect(parts).toHaveLength(3);
    expect(decodeBase64UrlJson(parts[1] ?? '')).toEqual(payload);
  });

  it('verifies a token signed with the same secret', () => {
    const payload = {
      sub: 'user@example.com',
      role: 'user' as const,
      iat: 1_774_353_600,
      exp: 1_774_357_200,
    };
    const token = signAuthToken(payload, 'shared-secret');

    expect(verifyAuthToken(token, 'shared-secret')).toEqual({
      ok: true,
      payload,
    });
  });

  it('rejects expired tokens', () => {
    const token = signAuthToken(
      {
        sub: 'user@example.com',
        role: 'user',
        iat: 1_711_270_000,
        exp: 1_711_280_000,
      },
      'test-secret'
    );

    expect(verifyAuthToken(token, 'test-secret')).toEqual({ ok: false, error: 'expired' });
  });

  it('rejects malformed or tampered tokens', () => {
    const validToken = signAuthToken(
      {
        sub: 'user@example.com',
        role: 'user',
        iat: 1_774_353_600,
        exp: 1_774_357_200,
      },
      'test-secret'
    );
    const [headerPart = '', payloadPart = ''] = validToken.split('.');
    const tamperedToken = `${headerPart}.${payloadPart}.wrong-signature`;

    expect(verifyAuthToken('not-a-jwt', 'test-secret')).toEqual({ ok: false, error: 'invalid' });
    expect(verifyAuthToken(tamperedToken, 'test-secret')).toEqual({ ok: false, error: 'invalid' });
  });
});
