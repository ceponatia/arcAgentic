import { CharacterProfileSchema } from '@arcagentic/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { entityProfiles } from '../../src/schema/index.js';
import {
  createEntityProfile,
  deleteEntityProfile,
  getCharacterProfile,
  getEntityProfile,
  listEntityProfiles,
  updateEntityProfile,
} from '../../src/repositories/entity-profiles.js';
import {
  createDeleteChain,
  createInsertChain,
  createSelectChain,
  createUpdateChain,
} from '../support/drizzle-mock.js';

const operators = vi.hoisted(() => ({
  eq: vi.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  and: vi.fn((...conditions: unknown[]) => ({ op: 'and', conditions })),
  or: vi.fn((...conditions: unknown[]) => ({ op: 'or', conditions })),
}));

const mockDb = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('drizzle-orm', () => operators);

vi.mock('../../src/connection/index.js', () => ({
  drizzle: mockDb,
  db: mockDb,
}));

function buildCharacterProfile(overrides: Record<string, unknown> = {}) {
  return CharacterProfileSchema.parse({
    id: '123e4567-e89b-42d3-a456-426614174000',
    name: 'Test Character',
    age: 25,
    gender: 'female',
    summary: 'A test character for unit tests',
    backstory: 'Created for testing purposes.',
    tags: ['test'],
    race: 'Human',
    tier: 'major',
    personality: ['curious', 'brave'],
    ...overrides,
  });
}

describe('entity profiles repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates entity profiles with package defaults applied', async () => {
    const row = { id: 'profile-1' };
    const insertChain = createInsertChain([row], 'returning');
    mockDb.insert.mockReturnValue(insertChain);

    const result = await createEntityProfile({ entityType: 'character', name: 'Alex' });

    expect(mockDb.insert).toHaveBeenCalledWith(entityProfiles);
    expect(insertChain.values).toHaveBeenCalledWith({
      id: undefined,
      entityType: 'character',
      name: 'Alex',
      ownerEmail: 'public',
      visibility: 'public',
      tier: undefined,
      profileJson: {},
      tags: [],
      embedding: undefined,
    });
    expect(result).toBe(row);
  });

  it('gets an entity profile by id', async () => {
    const row = { id: 'profile-1' };
    const selectChain = createSelectChain([row], 'limit');
    mockDb.select.mockReturnValue(selectChain);

    const result = await getEntityProfile('profile-1');

    expect(selectChain.from).toHaveBeenCalledWith(entityProfiles);
    expect(operators.eq).toHaveBeenCalledWith(entityProfiles.id, 'profile-1');
    expect(selectChain.limit).toHaveBeenCalledWith(1);
    expect(result).toBe(row);
  });

  it('returns null character profiles for non-uuid ids before querying', async () => {
    await expect(getCharacterProfile('not-a-uuid')).resolves.toBeNull();

    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('parses a stored character profile through the canonical schema', async () => {
    const characterId = '123e4567-e89b-42d3-a456-426614174000';
    const selectChain = createSelectChain(
      [
        {
          id: characterId,
          entityType: 'character',
          profileJson: buildCharacterProfile({ id: characterId, name: 'Alex Chen' }),
        },
      ],
      'limit'
    );
    mockDb.select.mockReturnValue(selectChain);

    const result = await getCharacterProfile(characterId);

    expect(operators.eq).toHaveBeenNthCalledWith(1, entityProfiles.id, characterId);
    expect(operators.eq).toHaveBeenNthCalledWith(2, entityProfiles.entityType, 'character');
    expect(result).toEqual(expect.objectContaining({ id: characterId, name: 'Alex Chen' }));
  });

  it('returns null when a stored character profile fails schema validation', async () => {
    const selectChain = createSelectChain(
      [
        {
          id: '123e4567-e89b-42d3-a456-426614174000',
          entityType: 'character',
          profileJson: { name: 'Broken Character' },
        },
      ],
      'limit'
    );
    mockDb.select.mockReturnValue(selectChain);

    await expect(getCharacterProfile('123e4567-e89b-42d3-a456-426614174000')).resolves.toBeNull();
  });

  it('lists entity profiles with type, owner, public visibility, and pagination filters', async () => {
    const rows = [{ id: 'profile-1' }];
    const selectChain = createSelectChain(rows, 'offset');
    mockDb.select.mockReturnValue(selectChain);

    const result = await listEntityProfiles({
      entityType: 'character',
      ownerEmail: 'owner@example.com',
      visibility: 'public',
      limit: 10,
      offset: 20,
    });

    expect(selectChain.$dynamic).toHaveBeenCalled();
    expect(operators.eq).toHaveBeenNthCalledWith(1, entityProfiles.entityType, 'character');
    expect(operators.eq).toHaveBeenNthCalledWith(2, entityProfiles.ownerEmail, 'owner@example.com');
    expect(operators.eq).toHaveBeenNthCalledWith(3, entityProfiles.visibility, 'public');
    expect(operators.or).toHaveBeenCalledWith(
      operators.eq.mock.results[1]?.value,
      operators.eq.mock.results[2]?.value
    );
    expect(operators.and).toHaveBeenCalledWith(
      operators.eq.mock.results[0]?.value,
      operators.or.mock.results[0]?.value
    );
    expect(selectChain.where).toHaveBeenCalledWith(operators.and.mock.results[0]?.value);
    expect(selectChain.limit).toHaveBeenCalledWith(10);
    expect(selectChain.offset).toHaveBeenCalledWith(20);
    expect(result).toEqual(rows);
  });

  it('lists entity profiles with a visibility-only filter when no owner is supplied', async () => {
    const selectChain = createSelectChain([], 'offset');
    mockDb.select.mockReturnValue(selectChain);

    await listEntityProfiles({ visibility: 'private' });

    expect(operators.eq).toHaveBeenCalledWith(entityProfiles.visibility, 'private');
    expect(selectChain.limit).toHaveBeenCalledWith(50);
    expect(selectChain.offset).toHaveBeenCalledWith(0);
  });

  it('lists entity profiles with an owner-only filter when visibility is not public', async () => {
    const selectChain = createSelectChain([], 'offset');
    mockDb.select.mockReturnValue(selectChain);

    await listEntityProfiles({ ownerEmail: 'owner@example.com', visibility: 'private' });

    expect(operators.eq).toHaveBeenCalledWith(entityProfiles.ownerEmail, 'owner@example.com');
    expect(operators.or).not.toHaveBeenCalled();
  });

  it('updates entity profiles with partial data and a fresh updatedAt timestamp', async () => {
    const row = { id: 'profile-1', name: 'Updated Name' };
    const updateChain = createUpdateChain([row], 'returning');
    mockDb.update.mockReturnValue(updateChain);

    const result = await updateEntityProfile('profile-1', { name: 'Updated Name', tags: ['updated'] });

    expect(mockDb.update).toHaveBeenCalledWith(entityProfiles);
    expect(updateChain.set).toHaveBeenCalledWith({
      name: 'Updated Name',
      tags: ['updated'],
      updatedAt: expect.any(Date),
    });
    expect(operators.eq).toHaveBeenCalledWith(entityProfiles.id, 'profile-1');
    expect(result).toBe(row);
  });

  it('deletes entity profiles by id', async () => {
    const deleteChain = createDeleteChain(undefined);
    mockDb.delete.mockReturnValue(deleteChain);

    await deleteEntityProfile('profile-1');

    expect(mockDb.delete).toHaveBeenCalledWith(entityProfiles);
    expect(operators.eq).toHaveBeenCalledWith(entityProfiles.id, 'profile-1');
    expect(deleteChain.where).toHaveBeenCalledWith(operators.eq.mock.results[0]?.value);
  });
});
