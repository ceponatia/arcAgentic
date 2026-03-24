import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './session-store.js';

function resetSessionStore(): void {
  useSessionStore.setState(useSessionStore.getInitialState(), true);
}

describe('useSessionStore', () => {
  beforeEach(() => {
    resetSessionStore();
  });

  it('starts with the expected initial state', () => {
    expect(useSessionStore.getState()).toMatchObject({
      currentSessionId: null,
      sessionStatus: 'disconnected',
      turnKey: 0,
      currentTick: 0,
    });
  });

  it('setSessionId updates the current session id', () => {
    useSessionStore.getState().setSessionId('session-123');

    expect(useSessionStore.getState().currentSessionId).toBe('session-123');
  });

  it('updateSessionStatus updates the session status', () => {
    useSessionStore.getState().updateSessionStatus('connected');

    expect(useSessionStore.getState().sessionStatus).toBe('connected');
  });

  it('bumpTurnKey increments turnKey', () => {
    useSessionStore.getState().bumpTurnKey();
    useSessionStore.getState().bumpTurnKey();

    expect(useSessionStore.getState().turnKey).toBe(2);
  });

  it('incrementTick increments currentTick', () => {
    useSessionStore.getState().incrementTick();
    useSessionStore.getState().incrementTick();

    expect(useSessionStore.getState().currentTick).toBe(2);
  });

  it('setTick sets a specific tick value', () => {
    useSessionStore.getState().setTick(42);

    expect(useSessionStore.getState().currentTick).toBe(42);
  });

  it('can be reset back to the initial state and still accepts actions', () => {
    useSessionStore.getState().setSessionId('session-123');
    useSessionStore.getState().updateSessionStatus('connected');
    useSessionStore.getState().bumpTurnKey();
    useSessionStore.getState().incrementTick();

    resetSessionStore();

    expect(useSessionStore.getState()).toMatchObject({
      currentSessionId: null,
      sessionStatus: 'disconnected',
      turnKey: 0,
      currentTick: 0,
    });

    useSessionStore.getState().setSessionId('session-456');

    expect(useSessionStore.getState().currentSessionId).toBe('session-456');
  });
});
