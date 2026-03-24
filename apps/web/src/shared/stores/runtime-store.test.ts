import { beforeEach, describe, expect, it } from 'vitest';
import { useRuntimeStore } from './runtime-store.js';

function resetRuntimeStore(): void {
  useRuntimeStore.setState(useRuntimeStore.getInitialState(), true);
}

describe('useRuntimeStore', () => {
  beforeEach(() => {
    resetRuntimeStore();
  });

  it('starts with the expected initial state', () => {
    expect(useRuntimeStore.getState()).toMatchObject({
      actorStates: {},
      activeActorIds: [],
      eventLog: [],
      lastEvent: null,
      selectedActorId: null,
      overlayOpen: false,
    });
  });

  it('updateActorState adds and updates actor state', () => {
    useRuntimeStore.getState().updateActorState('npc-1', { locationId: 'loc-1' });
    useRuntimeStore.getState().updateActorState('npc-1', { hpPercent: 75 });

    expect(useRuntimeStore.getState().actorStates).toEqual({
      'npc-1': { locationId: 'loc-1', hpPercent: 75 },
    });
    expect(useRuntimeStore.getState().activeActorIds).toEqual(['npc-1']);
  });

  it('resetActors clears actor state and active ids', () => {
    useRuntimeStore.getState().updateActorState('npc-1', { locationId: 'loc-1' });

    useRuntimeStore.getState().resetActors();

    expect(useRuntimeStore.getState().actorStates).toEqual({});
    expect(useRuntimeStore.getState().activeActorIds).toEqual([]);
  });

  it('addEvent appends to the event log and tracks the last event', () => {
    const event = { type: 'NPC_MOVED', timestamp: '2026-03-24T00:00:00Z', actorId: 'npc-1' };

    useRuntimeStore.getState().addEvent(event);

    expect(useRuntimeStore.getState().eventLog).toEqual([event]);
    expect(useRuntimeStore.getState().lastEvent).toEqual(event);
  });

  it('addEvent caps the event log at 100 entries', () => {
    for (let index = 0; index < 105; index += 1) {
      useRuntimeStore.getState().addEvent({ type: `EVENT_${index}`, sequence: index });
    }

    const { eventLog, lastEvent } = useRuntimeStore.getState();

    expect(eventLog).toHaveLength(100);
    expect(eventLog[0]).toMatchObject({ type: 'EVENT_5', sequence: 5 });
    expect(eventLog.at(-1)).toMatchObject({ type: 'EVENT_104', sequence: 104 });
    expect(lastEvent).toMatchObject({ type: 'EVENT_104', sequence: 104 });
  });

  it('clearEvents empties the event log and clears lastEvent', () => {
    useRuntimeStore.getState().addEvent({ type: 'EVENT_1' });

    useRuntimeStore.getState().clearEvents();

    expect(useRuntimeStore.getState().eventLog).toEqual([]);
    expect(useRuntimeStore.getState().lastEvent).toBeNull();
  });

  it('setSelectedActorId updates the selected actor', () => {
    useRuntimeStore.getState().setSelectedActorId('npc-1');

    expect(useRuntimeStore.getState().selectedActorId).toBe('npc-1');
  });

  it('toggleOverlay flips the overlayOpen flag', () => {
    useRuntimeStore.getState().toggleOverlay();
    expect(useRuntimeStore.getState().overlayOpen).toBe(true);

    useRuntimeStore.getState().toggleOverlay();
    expect(useRuntimeStore.getState().overlayOpen).toBe(false);
  });
});
