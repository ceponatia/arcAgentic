import { beforeEach, describe, expect, it, vi } from 'vitest';

import { promptTags } from '../../src/schema/index.js';
import { seedBuiltInTags } from '../../src/seeds/built-in-tags.js';
import { createInsertChain } from '../support/drizzle-mock.js';

const drizzleHelpers = vi.hoisted(() => ({
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

const mockDb = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  sql: drizzleHelpers.sql,
}));

vi.mock('../../src/connection/index.js', () => ({
  drizzle: mockDb,
  db: mockDb,
}));

describe('seedBuiltInTags', () => {
  const pool = {
    query: vi.fn(),
    end: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('inserts every built-in tag definition in insert mode', async () => {
    const insertChain = createInsertChain([], 'onConflictDoNothing');
    mockDb.insert.mockReturnValue(insertChain);

    await seedBuiltInTags(pool);

    expect(mockDb.insert).toHaveBeenCalledWith(promptTags);
    const values = insertChain.values.mock.calls[0]?.[0];
    expect(values).toHaveLength(13);
    expect(values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Minimalist Prose', category: 'style' }),
        expect.objectContaining({ name: 'Roll-Based Outcomes', category: 'mechanic' }),
        expect.objectContaining({ name: 'Fade to Black', category: 'content' }),
        expect.objectContaining({ name: 'Verbal Magic', category: 'world' }),
      ])
    );
  });

  it('marks every seeded tag as active', async () => {
    const insertChain = createInsertChain([], 'onConflictDoNothing');
    mockDb.insert.mockReturnValue(insertChain);

    await seedBuiltInTags(pool);

    const values = insertChain.values.mock.calls[0]?.[0] as Array<{ isActive: boolean }>;
    expect(values.every((tag) => tag.isActive)).toBe(true);
  });

  it('uses conflict-do-nothing against prompt tag names in insert mode', async () => {
    const insertChain = createInsertChain([], 'onConflictDoNothing');
    mockDb.insert.mockReturnValue(insertChain);

    await seedBuiltInTags(pool, { mode: 'insert' });

    expect(insertChain.onConflictDoNothing).toHaveBeenCalledWith({ target: promptTags.name });
    expect(insertChain.onConflictDoUpdate).not.toHaveBeenCalled();
  });

  it('uses conflict-do-update against prompt tag names in upsert mode', async () => {
    const insertChain = createInsertChain([], 'onConflictDoUpdate');
    mockDb.insert.mockReturnValue(insertChain);

    await seedBuiltInTags(pool, { mode: 'upsert' });

    expect(insertChain.onConflictDoUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = insertChain.onConflictDoUpdate.mock.calls[0]?.[0];
    expect(updateArgs.target).toBe(promptTags.name);
    expect(updateArgs.set).toEqual(
      expect.objectContaining({
        description: expect.any(Object),
        category: expect.any(Object),
        promptText: expect.any(Object),
        isActive: true,
        updatedAt: expect.any(Date),
      })
    );
  });

  it('builds the upsert update clause with excluded column references', async () => {
    const insertChain = createInsertChain([], 'onConflictDoUpdate');
    mockDb.insert.mockReturnValue(insertChain);

    await seedBuiltInTags(pool, { mode: 'upsert' });

    expect(drizzleHelpers.sql).toHaveBeenCalledTimes(3);
    expect(drizzleHelpers.sql.mock.calls[0]?.[0][0]).toContain('excluded.description');
    expect(drizzleHelpers.sql.mock.calls[1]?.[0][0]).toContain('excluded.category');
    expect(drizzleHelpers.sql.mock.calls[2]?.[0][0]).toContain('excluded.prompt_text');
  });

  it('does not use the legacy pool query interface', async () => {
    const insertChain = createInsertChain([], 'onConflictDoNothing');
    mockDb.insert.mockReturnValue(insertChain);

    await seedBuiltInTags(pool);

    expect(pool.query).not.toHaveBeenCalled();
  });
});
