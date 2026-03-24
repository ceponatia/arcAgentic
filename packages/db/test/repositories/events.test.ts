import { beforeEach, describe, expect, it, vi } from 'vitest';

import { events } from '../../src/schema/index.js';
import { getEventsForSession, saveEvent } from '../../src/repositories/events.js';
import { createInsertChain, createSelectChain } from '../support/drizzle-mock.js';

const operators = vi.hoisted(() => ({
  eq: vi.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  and: vi.fn((...conditions: unknown[]) => ({ op: 'and', conditions })),
  gte: vi.fn((left: unknown, right: unknown) => ({ op: 'gte', left, right })),
  asc: vi.fn((column: unknown) => ({ op: 'asc', column })),
}));

const mockDb = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock('drizzle-orm', () => operators);

vi.mock('../../src/connection/drizzle.js', () => ({
  drizzle: mockDb,
  db: mockDb,
}));

describe('events repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves an event with the expected insert payload', async () => {
    const row = { id: 'event-1', sessionId: 'session-1' };
    const insertChain = createInsertChain([row], 'returning');
    mockDb.insert.mockReturnValue(insertChain);

    const result = await saveEvent({
      sessionId: 'session-1',
      sequence: 4n,
      type: 'PLAYER_ACTION',
      payload: { intent: 'move' },
    });

    expect(mockDb.insert).toHaveBeenCalledWith(events);
    expect(insertChain.values).toHaveBeenCalledWith({
      sessionId: 'session-1',
      sequence: 4n,
      type: 'PLAYER_ACTION',
      payload: { intent: 'move' },
      actorId: undefined,
      causedByEventId: undefined,
    });
    expect(result).toBe(row);
  });

  it('passes actor and causation ids through when present', async () => {
    const insertChain = createInsertChain([{ id: 'event-2' }], 'returning');
    mockDb.insert.mockReturnValue(insertChain);

    await saveEvent({
      sessionId: 'session-1',
      sequence: 5n,
      type: 'NPC_ACTION',
      payload: [{ action: 'speak' }],
      actorId: 'npc-1',
      causedByEventId: 'event-1',
    });

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'npc-1',
        causedByEventId: 'event-1',
      })
    );
  });

  it('loads session events in ascending sequence order with the default lower bound', async () => {
    const rows = [{ id: 'event-1', sequence: 0n }];
    const selectChain = createSelectChain(rows, 'orderBy');
    mockDb.select.mockReturnValue(selectChain);

    const result = await getEventsForSession('session-1');

    expect(selectChain.from).toHaveBeenCalledWith(events);
    expect(operators.eq).toHaveBeenCalledWith(events.sessionId, 'session-1');
    expect(operators.gte).toHaveBeenCalledWith(events.sequence, 0n);
    expect(operators.and).toHaveBeenCalledWith(
      operators.eq.mock.results[0]?.value,
      operators.gte.mock.results[0]?.value
    );
    expect(operators.asc).toHaveBeenCalledWith(events.sequence);
    expect(selectChain.orderBy).toHaveBeenCalledWith(operators.asc.mock.results[0]?.value);
    expect(result).toEqual(rows);
  });

  it('uses the provided fromSequence filter when loading events', async () => {
    const selectChain = createSelectChain([], 'orderBy');
    mockDb.select.mockReturnValue(selectChain);

    await getEventsForSession('session-1', 10n);

    expect(operators.gte).toHaveBeenCalledWith(events.sequence, 10n);
  });
});
