import {
  getArraySafe,
  getRecord,
  getRecordOptional,
  getTuple,
  setPartialRecord,
  setRecord,
} from '@arcagentic/schemas';

describe('record helpers', () => {
  it('returns the value for an existing key', () => {
    const record = { alpha: 1, beta: 2 };

    expect(getRecord(record, 'alpha')).toBe(1);
  });

  it('returns the value for a key present in a typed Record', () => {
    type Letter = 'a' | 'b';
    const record: Record<Letter, string> = { a: 'first', b: 'second' };

    expect(getRecord(record, 'b')).toBe('second');
  });

  it('returns undefined from getRecordOptional when the record is undefined', () => {
    expect(getRecordOptional(undefined, 'missing')).toBeUndefined();
  });

  it('returns a value from getRecordOptional when the record exists', () => {
    const record: Partial<Record<'alpha' | 'beta', number>> = { alpha: 5 };

    expect(getRecordOptional(record, 'alpha')).toBe(5);
  });

  it('sets a value with setRecord', () => {
    const record: Record<'alpha' | 'beta', number> = { alpha: 1, beta: 2 };

    setRecord(record, 'beta', 9);

    expect(record.beta).toBe(9);
  });

  it('sets a value with setPartialRecord', () => {
    const record: Partial<Record<'alpha' | 'beta', number>> = { alpha: 1 };

    setPartialRecord(record, 'beta', 4);

    expect(record.beta).toBe(4);
  });

  it('returns an array element at a valid index', () => {
    expect(getArraySafe(['a', 'b', 'c'], 1)).toBe('b');
  });

  it('returns undefined for an out-of-bounds array index', () => {
    expect(getArraySafe(['a', 'b', 'c'], 10)).toBeUndefined();
  });

  it('returns undefined for a negative array index', () => {
    expect(getArraySafe(['a', 'b', 'c'], -1)).toBeUndefined();
  });

  it('returns tuple members with getTuple', () => {
    const tuple = ['alpha', 42, true] as const;

    expect(getTuple(tuple, 0)).toBe('alpha');
    expect(getTuple(tuple, 1)).toBe(42);
    expect(getTuple(tuple, 2)).toBe(true);
  });
});
