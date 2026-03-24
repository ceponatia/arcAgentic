import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorldEvent } from '@arcagentic/schemas';
import { buildTickEvent } from '../../../config/vitest/builders/world-event.js';
import { Projector } from '../src/projector.js';
import type { Projection } from '../src/types.js';

const dbModule = vi.hoisted(() => ({
  findFirst: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(() => 'eq-clause'),
  gt: vi.fn(() => 'gt-clause'),
  and: vi.fn(() => 'and-clause'),
  asc: vi.fn(() => 'asc-clause'),
  events: {
    sessionId: 'events.sessionId',
    sequence: 'events.sequence',
  },
  sessionProjections: {
    sessionId: 'sessionProjections.sessionId',
  },
}));

vi.mock('@arcagentic/db', () => ({
  db: {
    query: {
      sessionProjections: {
        findFirst: dbModule.findFirst,
      },
    },
    select: dbModule.select,
  },
  events: dbModule.events,
  sessionProjections: dbModule.sessionProjections,
  eq: dbModule.eq,
  gt: dbModule.gt,
  and: dbModule.and,
  asc: dbModule.asc,
}));

interface CounterState {
  count: number;
}

interface ReplayRow {
  sequence: bigint;
  payload: WorldEvent;
}

const counterProjection: Projection<CounterState> = {
  name: 'location',
  initialState: { count: 0 },
  reducer: (state, event) => {
    if (event.type === 'TICK') {
      return { count: state.count + event.tick };
    }

    return state;
  },
};

function mockReplayBatches(batches: ReplayRow[][]): void {
  dbModule.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => batches.shift() ?? [],
        }),
      }),
    }),
  }));
}

describe('Projector', () => {
  beforeEach(() => {
    dbModule.findFirst.mockReset();
    dbModule.select.mockReset();
    dbModule.eq.mockClear();
    dbModule.gt.mockClear();
    dbModule.and.mockClear();
    dbModule.asc.mockClear();
  });

  it('starts from the projection initial state', () => {
    const projector = new Projector(counterProjection, 'session-test-001');

    expect(projector.getState()).toEqual({ count: 0 });
  });

  it('returns the current state via getState', () => {
    const projector = new Projector(counterProjection, 'session-test-001');

    projector.applyEvent(buildTickEvent({ tick: 2 }), 1n);

    expect(projector.getState()).toEqual({ count: 2 });
  });

  it('starts with a last sequence of -1n', () => {
    const projector = new Projector(counterProjection, 'session-test-001');

    expect(projector.getLastSequence()).toBe(-1n);
  });

  it('applies events in memory and updates the last sequence', () => {
    const projector = new Projector(counterProjection, 'session-test-001');

    projector.applyEvent(buildTickEvent({ tick: 3 }), 4n);

    expect(projector.getState()).toEqual({ count: 3 });
    expect(projector.getLastSequence()).toBe(4n);
  });

  it('ignores applyEvent calls for old sequences', () => {
    const projector = new Projector(counterProjection, 'session-test-001');

    projector.applyEvent(buildTickEvent({ tick: 3 }), 4n);
    projector.applyEvent(buildTickEvent({ tick: 20 }), 4n);
    projector.applyEvent(buildTickEvent({ tick: 20 }), 3n);

    expect(projector.getState()).toEqual({ count: 3 });
    expect(projector.getLastSequence()).toBe(4n);
  });

  it('applies multiple in-memory events in sequence', () => {
    const projector = new Projector(counterProjection, 'session-test-001');

    projector.applyEvent(buildTickEvent({ tick: 1 }), 1n);
    projector.applyEvent(buildTickEvent({ tick: 2 }), 2n);
    projector.applyEvent(buildTickEvent({ tick: 3 }), 3n);

    expect(projector.getState()).toEqual({ count: 6 });
    expect(projector.getLastSequence()).toBe(3n);
  });

  it('loads snapshot state and sequence from the database', async () => {
    dbModule.findFirst.mockResolvedValue({
      location: { count: 7 },
      lastEventSeq: 9n,
    });

    const projector = new Projector(counterProjection, 'session-test-001');

    await projector.loadSnapshot();

    expect(projector.getState()).toEqual({ count: 7 });
    expect(projector.getLastSequence()).toBe(9n);
    expect(dbModule.eq).toHaveBeenCalledWith(
      dbModule.sessionProjections.sessionId,
      'session-test-001'
    );
  });

  it('keeps the initial state when no snapshot exists', async () => {
    dbModule.findFirst.mockResolvedValue(undefined);

    const projector = new Projector(counterProjection, 'session-test-001');

    await projector.loadSnapshot();

    expect(projector.getState()).toEqual({ count: 0 });
    expect(projector.getLastSequence()).toBe(-1n);
  });

  it('replays rows from the database and updates state', async () => {
    mockReplayBatches([
      [
        { sequence: 1n, payload: buildTickEvent({ tick: 2 }) },
        { sequence: 2n, payload: buildTickEvent({ tick: 4 }) },
      ],
    ]);

    const projector = new Projector(counterProjection, 'session-test-001');

    await projector.replay();

    expect(projector.getState()).toEqual({ count: 6 });
    expect(projector.getLastSequence()).toBe(2n);
    expect(dbModule.gt).toHaveBeenCalledWith(dbModule.events.sequence, -1n);
  });

  it('stops replaying when untilSeq is reached', async () => {
    mockReplayBatches([
      [
        { sequence: 1n, payload: buildTickEvent({ tick: 1 }) },
        { sequence: 2n, payload: buildTickEvent({ tick: 2 }) },
        { sequence: 3n, payload: buildTickEvent({ tick: 3 }) },
      ],
    ]);

    const projector = new Projector(counterProjection, 'session-test-001');

    await projector.replay({ untilSeq: 2n, batchSize: 10 });

    expect(projector.getState()).toEqual({ count: 3 });
    expect(projector.getLastSequence()).toBe(2n);
  });

  it('continues replaying across multiple select batches', async () => {
    mockReplayBatches([
      [{ sequence: 1n, payload: buildTickEvent({ tick: 1 }) }],
      [{ sequence: 2n, payload: buildTickEvent({ tick: 2 }) }],
      [],
    ]);

    const projector = new Projector(counterProjection, 'session-test-001');

    await projector.replay({ batchSize: 1 });

    expect(projector.getState()).toEqual({ count: 3 });
    expect(projector.getLastSequence()).toBe(2n);
    expect(dbModule.select).toHaveBeenCalledTimes(3);
  });
});
