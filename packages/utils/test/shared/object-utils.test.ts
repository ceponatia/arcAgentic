import { clamp } from '../../src/shared/math.js';
import { deepClone, deepMergeReplaceArrays, isPlainObject } from '../../src/shared/object.js';

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({ value: 1 })).toBe(true);
  });

  it('returns false for arrays, null, Date, undefined, strings, and numbers', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(new Date())).toBe(true);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject('value')).toBe(false);
    expect(isPlainObject(1)).toBe(false);
  });
});

describe('deepMergeReplaceArrays', () => {
  it('merges nested objects', () => {
    const base = {
      config: { enabled: false, retries: 1 },
      name: 'base',
    };
    const override = {
      config: { enabled: true },
    };

    expect(deepMergeReplaceArrays(base, override)).toEqual({
      config: { enabled: true, retries: 1 },
      name: 'base',
    });
  });

  it('replaces arrays instead of merging them', () => {
    const base = { values: [1, 2, 3] };
    const override = { values: [9] };

    expect(deepMergeReplaceArrays(base, override)).toEqual({ values: [9] });
  });

  it('returns the base value when the override is undefined', () => {
    const base = { values: [1, 2, 3] };

    expect(deepMergeReplaceArrays(base, undefined)).toBe(base);
  });
});

describe('deepClone', () => {
  it('creates an independent copy', () => {
    const original = { nested: { value: 1 }, values: ['a', 'b'] };
    const clone = deepClone(original);

    clone.nested.value = 2;
    clone.values.push('c');

    expect(original).toEqual({ nested: { value: 1 }, values: ['a', 'b'] });
    expect(clone).toEqual({ nested: { value: 2 }, values: ['a', 'b', 'c'] });
  });
});

describe('clamp', () => {
  it('constrains values within the range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-1, 1, 10)).toBe(1);
    expect(clamp(12, 1, 10)).toBe(10);
  });
});
