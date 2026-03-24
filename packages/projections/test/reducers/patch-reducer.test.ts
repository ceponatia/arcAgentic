import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTickEvent } from '../../../../config/vitest/builders/world-event.js';
import { patchReducer } from '../../src/reducers/patch.js';

describe('patchReducer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the same state for non-STATE_CHANGE events', () => {
    const state = { foo: 'bar' };
    const result = patchReducer(state, buildTickEvent());

    expect(result).toBe(state);
  });

  it('applies a single path/value change with a leading slash', () => {
    const state = { foo: 'before' };

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      path: '/foo',
      value: 'after',
    });

    expect(result).toEqual({ foo: 'after' });
  });

  it('auto-prefixes paths that do not start with a slash', () => {
    const state = { foo: 'before' };

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      path: 'foo',
      value: 'after',
    });

    expect(result).toEqual({ foo: 'after' });
  });

  it('supports nested payload path/value changes', () => {
    const state = { nested: { count: 0 } };

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      payload: {
        path: '/nested/count',
        value: 1,
      },
    });

    expect(result).toEqual({ nested: { count: 1 } });
  });

  it('applies multiple add patches', () => {
    const state = {};

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      patches: [{ op: 'add', path: '/key', value: 42 }],
    });

    expect(result).toEqual({ key: 42 });
  });

  it('applies replace operations from a patches array', () => {
    const state = { key: 1 };

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      patches: [{ op: 'replace', path: '/key', value: 99 }],
    });

    expect(result).toEqual({ key: 99 });
  });

  it('applies remove operations from a patches array', () => {
    const state = { key: 1, keep: true };

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      patches: [{ op: 'remove', path: '/key' }],
    });

    expect(result).toEqual({ keep: true });
  });

  it('returns the same state and warns for invalid single patches', () => {
    const state = { existing: true };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      path: '/missing',
      value: 1,
    });

    expect(result).toBe(state);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('returns the same state and warns for invalid patch arrays', () => {
    const state = { existing: true };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      patches: [{ op: 'replace', path: '/missing', value: 1 }],
    });

    expect(result).toBe(state);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('returns state unchanged for an empty patches array', () => {
    const state = { foo: 'bar' };

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      patches: [],
    });

    expect(result).toEqual(state);
  });

  it('returns state unchanged when STATE_CHANGE has no usable patch payload', () => {
    const state = { foo: 'bar' };

    const result = patchReducer(state, {
      type: 'STATE_CHANGE',
      payload: { ignored: true },
    });

    expect(result).toBe(state);
  });
});
