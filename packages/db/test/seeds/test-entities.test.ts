import { beforeEach, describe, expect, it, vi } from 'vitest';

import { seedTestEntities } from '../../src/seeds/test-entities.js';

describe('seedTestEntities', () => {
  const pool = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('creates the seeded setting profile for Lanse Creuse High', async () => {
    await seedTestEntities(pool);

    const [sql, params] = pool.query.mock.calls[0] ?? [];
    expect(sql).toContain('INSERT INTO setting_profiles');
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
    expect(params[0]).toBe('test-setting-001');
    expect(JSON.parse(params[1])).toEqual(
      expect.objectContaining({
        name: 'Lanse Creuse High',
        tags: expect.arrayContaining(['modern', 'school', 'realistic']),
      })
    );
  });

  it('creates the seeded location map with nodes, connections, and a default start location', async () => {
    await seedTestEntities(pool);

    const [sql, params] = pool.query.mock.calls[1] ?? [];
    expect(sql).toContain('INSERT INTO location_maps');
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
    expect(params[0]).toBe('00000000-0000-0000-0000-000000000029');
    expect(params[3]).toBe('Lanse Creuse High - Starter Map');
    expect(params[8]).toBe('test-loc-hallway-001');
    expect(JSON.parse(params[6])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'test-loc-campus-001', type: 'region' }),
        expect.objectContaining({ id: 'test-loc-hallway-001', type: 'room' }),
      ])
    );
    expect(JSON.parse(params[7])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'test-conn-hallway-library', bidirectional: true }),
        expect.objectContaining({ id: 'test-conn-hallway-cafeteria', travelMinutes: 2 }),
      ])
    );
  });

  it('creates the seeded Alex Chen character profile', async () => {
    await seedTestEntities(pool);

    const [sql, params] = pool.query.mock.calls[2] ?? [];
    expect(sql).toContain('INSERT INTO character_profiles');
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
    expect(params[0]).toBe('test-character-001');
    expect(JSON.parse(params[1])).toEqual(
      expect.objectContaining({
        name: 'Alex Chen',
        tier: 'major',
        tags: expect.arrayContaining(['student', 'senior', 'academic']),
      })
    );
  });

  it('uses do-nothing conflict handling in insert mode', async () => {
    await seedTestEntities(pool, { mode: 'insert' });

    for (const [sql] of pool.query.mock.calls) {
      expect(sql).toContain('DO NOTHING');
      expect(sql).not.toContain('DO UPDATE SET');
    }
  });

  it('uses do-update conflict handling in upsert mode', async () => {
    await seedTestEntities(pool, { mode: 'upsert' });

    for (const [sql] of pool.query.mock.calls) {
      expect(sql).toContain('DO UPDATE SET');
    }
  });
});
