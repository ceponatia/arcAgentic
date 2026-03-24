import { describe, expect, it } from 'vitest';

import { resolveDatabaseUrl } from '../../src/connection/resolve-database-url.js';

describe('resolveDatabaseUrl', () => {
  it('uses DATABASE_URL when it is available', () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: 'postgres://remote-db', DATABASE_URL_LOCAL: undefined })
    ).toEqual({ url: 'postgres://remote-db', source: 'DATABASE_URL' });
  });

  it('uses DATABASE_URL_LOCAL when DB_TARGET is local', () => {
    expect(
      resolveDatabaseUrl({
        DB_TARGET: 'local',
        DATABASE_URL: 'postgres://remote-db',
        DATABASE_URL_LOCAL: 'postgres://local-db',
      })
    ).toEqual({ url: 'postgres://local-db', source: 'DATABASE_URL_LOCAL' });
  });

  it('normalizes DB_TARGET casing and whitespace before matching local', () => {
    expect(
      resolveDatabaseUrl({
        DB_TARGET: '  LoCaL  ',
        DATABASE_URL_LOCAL: 'postgres://local-db',
      })
    ).toEqual({ url: 'postgres://local-db', source: 'DATABASE_URL_LOCAL' });
  });

  it('falls back to DATABASE_URL_LOCAL when no primary DATABASE_URL exists', () => {
    expect(resolveDatabaseUrl({ DATABASE_URL_LOCAL: 'postgres://local-db' })).toEqual({
      url: 'postgres://local-db',
      source: 'DATABASE_URL_LOCAL',
    });
  });

  it('prefers DATABASE_URL over DATABASE_URL_LOCAL for non-local targets', () => {
    expect(
      resolveDatabaseUrl({
        DB_TARGET: 'production',
        DATABASE_URL: 'postgres://remote-db',
        DATABASE_URL_LOCAL: 'postgres://local-db',
      })
    ).toEqual({ url: 'postgres://remote-db', source: 'DATABASE_URL' });
  });

  it('preserves complex URLs without reparsing them', () => {
    const url = 'postgres://user:pass@db.example.com:5432/app?sslmode=require';

    expect(resolveDatabaseUrl({ DATABASE_URL: url }).url).toBe(url);
  });

  it('throws when DB_TARGET is local but DATABASE_URL_LOCAL is missing', () => {
    expect(() => resolveDatabaseUrl({ DB_TARGET: 'local', DATABASE_URL: 'postgres://remote-db' })).toThrow(
      'DB_TARGET=local but DATABASE_URL_LOCAL is not defined'
    );
  });

  it('throws when neither DATABASE_URL nor DATABASE_URL_LOCAL are set', () => {
    expect(() => resolveDatabaseUrl({})).toThrow(
      'No database URL found (checked DATABASE_URL, DATABASE_URL_LOCAL)'
    );
  });
});
