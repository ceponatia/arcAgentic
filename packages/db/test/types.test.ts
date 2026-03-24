import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  DbRow,
  DbRows,
  OwnerEmail,
  PgClientLike,
  PgPoolLike,
  PgPoolStrict,
  QueryResult,
  UUID,
} from '../src/types.js';

describe('db shared types', () => {
  it('keeps UUID and OwnerEmail as string aliases', () => {
    const id: UUID = '00000000-0000-0000-0000-000000000001';
    const ownerEmail: OwnerEmail = 'owner@example.com';

    expect(id).toContain('-');
    expect(ownerEmail).toContain('@');
    expectTypeOf<UUID>().toEqualTypeOf<string>();
    expectTypeOf<OwnerEmail>().toEqualTypeOf<string>();
  });

  it('models DbRow and DbRows as record-based row containers', () => {
    const row: DbRow = { id: 'row-1', count: 2 };
    const rows: DbRows = [row];

    expect(rows).toEqual([{ id: 'row-1', count: 2 }]);
    expectTypeOf<DbRows>().toEqualTypeOf<Array<Record<string, unknown>>>();
  });

  it('models QueryResult as a typed row array plus optional rowCount', () => {
    const result: QueryResult<{ id: string }> = {
      rows: [{ id: 'row-1' }],
      rowCount: 1,
    };

    expect(result.rows[0]?.id).toBe('row-1');
    expect(result.rowCount).toBe(1);
    expectTypeOf<QueryResult<{ id: string }>>().toMatchTypeOf<{
      rows: Array<{ id: string }>;
      rowCount?: number;
    }>();
  });

  it('accepts the minimal PgPoolLike interface used by seed scripts', async () => {
    const pool: PgPoolLike = {
      query: async () => ({ rows: [], rowCount: 0 }),
      end: async () => undefined,
    };

    await expect(pool.end()).resolves.toBeUndefined();
    await expect(pool.query('select 1')).resolves.toEqual({ rows: [], rowCount: 0 });
  });

  it('keeps the strict pool and client interfaces aligned around typed query results', async () => {
    const client: PgClientLike = {
      query: async () => ({ rows: [{ id: 'row-1' }], rowCount: 1 }),
      release: () => undefined,
    };
    const pool: PgPoolStrict = {
      connect: async () => client,
      query: async () => ({ rows: [{ id: 'row-1' }], rowCount: 1 }),
      end: async () => undefined,
    };

    const connectedClient = await pool.connect();
    expect(await connectedClient.query<{ id: string }>('select 1')).toEqual({
      rows: [{ id: 'row-1' }],
      rowCount: 1,
    });
    connectedClient.release();
  });
});
