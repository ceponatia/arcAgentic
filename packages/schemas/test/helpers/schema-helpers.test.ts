import { coercedDate, nullableOptional, numericString } from '@arcagentic/schemas';
import { z } from 'zod';

describe('schema helpers', () => {
  it('nullableOptional accepts a value and returns the value', () => {
    const schema = nullableOptional(z.string());

    expect(schema.parse('value')).toBe('value');
  });

  it('nullableOptional accepts null and returns undefined', () => {
    const schema = nullableOptional(z.string());

    expect(schema.parse(null)).toBeUndefined();
  });

  it('nullableOptional accepts undefined and returns undefined', () => {
    const schema = nullableOptional(z.string());

    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('nullableOptional preserves wrapped string schema validation', () => {
    const schema = nullableOptional(z.string().min(2));

    expect(schema.safeParse('ok').success).toBe(true);
    expect(schema.safeParse('a').success).toBe(false);
  });

  it('nullableOptional preserves wrapped number schema validation', () => {
    const schema = nullableOptional(z.number().min(1));

    expect(schema.safeParse(2).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(false);
  });

  it('numericString parses integer strings', () => {
    expect(numericString.parse('123')).toBe(123);
  });

  it('numericString parses floating point strings', () => {
    expect(numericString.parse('3.14')).toBe(3.14);
  });

  it('numericString returns undefined for an empty string', () => {
    expect(numericString.parse('')).toBeUndefined();
  });

  it('numericString returns undefined for a non-numeric string', () => {
    expect(numericString.parse('abc')).toBeUndefined();
  });

  it('numericString returns undefined for NaN', () => {
    expect(numericString.parse('NaN')).toBeUndefined();
  });

  it('coercedDate parses ISO strings to Date objects', () => {
    const result = coercedDate.parse('2025-01-01T00:00:00.000Z');

    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('coercedDate parses epoch numbers to Date objects', () => {
    const result = coercedDate.parse(1735689600000);

    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('coercedDate rejects invalid date input gracefully', () => {
    expect(coercedDate.safeParse('not-a-date').success).toBe(false);
  });
});
