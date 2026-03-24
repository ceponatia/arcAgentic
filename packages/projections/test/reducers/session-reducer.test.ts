import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorldEvent } from '@arcagentic/schemas';
import {
  buildSessionStartEvent,
  buildSpeakIntent,
  buildTickEvent,
} from '../../../../config/vitest/builders/world-event.js';
import {
  initialSessionState,
  sessionReducer,
} from '../../src/reducers/session.js';

type SessionEndEvent = Extract<WorldEvent, { type: 'SESSION_END' }>;

function buildSessionEndEvent(
  overrides: Partial<SessionEndEvent> = {}
): SessionEndEvent {
  return {
    type: 'SESSION_END',
    sessionId: 'session-test-001',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('sessionReducer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T08:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with the expected initial state', () => {
    expect(initialSessionState).toEqual({ status: 'inactive', currentTick: 0 });
  });

  it('marks the session as active on SESSION_START', () => {
    const result = sessionReducer(initialSessionState, buildSessionStartEvent());

    expect(result.status).toBe('active');
  });

  it('sets the start time and resets the tick on SESSION_START', () => {
    const result = sessionReducer(
      { ...initialSessionState, currentTick: 99 },
      buildSessionStartEvent()
    );

    expect(result.startTime).toEqual(new Date('2026-03-24T08:00:00Z'));
    expect(result.currentTick).toBe(0);
  });

  it('marks the session as inactive on SESSION_END', () => {
    const activeState = sessionReducer(initialSessionState, buildSessionStartEvent());

    vi.setSystemTime(new Date('2026-03-24T09:00:00Z'));

    const result = sessionReducer(activeState, buildSessionEndEvent());

    expect(result.status).toBe('inactive');
  });

  it('sets the end time on SESSION_END', () => {
    const activeState = sessionReducer(initialSessionState, buildSessionStartEvent());

    vi.setSystemTime(new Date('2026-03-24T09:30:00Z'));

    const result = sessionReducer(activeState, buildSessionEndEvent());

    expect(result.endTime).toEqual(new Date('2026-03-24T09:30:00Z'));
  });

  it('updates the current tick from a TICK event', () => {
    const result = sessionReducer(initialSessionState, buildTickEvent({ tick: 7 }));

    expect(result.currentTick).toBe(7);
  });

  it('preserves the session status when handling TICK', () => {
    const activeState = sessionReducer(initialSessionState, buildSessionStartEvent());
    const result = sessionReducer(activeState, buildTickEvent({ tick: 3 }));

    expect(result.status).toBe('active');
    expect(result.startTime).toEqual(new Date('2026-03-24T08:00:00Z'));
  });

  it('returns the same state object for unrelated events', () => {
    const state = sessionReducer(initialSessionState, buildSessionStartEvent());
    const result = sessionReducer(state, buildSpeakIntent());

    expect(result).toBe(state);
  });

  it('preserves the current tick when the session ends', () => {
    const activeState = sessionReducer(initialSessionState, buildSessionStartEvent());
    const tickedState = sessionReducer(activeState, buildTickEvent({ tick: 12 }));
    const result = sessionReducer(tickedState, buildSessionEndEvent());

    expect(result.currentTick).toBe(12);
  });

  it('handles a start, two ticks, and an end in sequence', () => {
    const startedState = sessionReducer(initialSessionState, buildSessionStartEvent());
    const firstTickState = sessionReducer(startedState, buildTickEvent({ tick: 1 }));
    const secondTickState = sessionReducer(firstTickState, buildTickEvent({ tick: 2 }));

    vi.setSystemTime(new Date('2026-03-24T10:00:00Z'));

    const endedState = sessionReducer(secondTickState, buildSessionEndEvent());

    expect(endedState).toEqual({
      status: 'inactive',
      currentTick: 2,
      startTime: new Date('2026-03-24T08:00:00Z'),
      endTime: new Date('2026-03-24T10:00:00Z'),
    });
  });
});
