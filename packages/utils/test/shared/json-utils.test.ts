import { z } from 'zod';
import {
  extractJsonField,
  parseWithSchema,
  safeParseJson,
  tryParseJson,
} from '../../src/shared/json.js';

describe('safeParseJson', () => {
  it('returns the parsed object for valid JSON', () => {
    expect(safeParseJson('{"value":1}', { value: 0 })).toEqual({ value: 1 });
  });

  it('returns the fallback for invalid JSON', () => {
    const fallback = { value: 0 };

    expect(safeParseJson('{"value":', fallback)).toBe(fallback);
  });

  it('returns the fallback for empty input', () => {
    const fallback = { value: 0 };

    expect(safeParseJson('', fallback)).toBe(fallback);
  });
});

describe('tryParseJson', () => {
  it('returns the parsed value for valid JSON', () => {
    expect(tryParseJson<{ value: number }>(' {"value":2} ')).toEqual({ value: 2 });
  });

  it('returns undefined for invalid JSON', () => {
    expect(tryParseJson('{"value":')).toBeUndefined();
  });
});

describe('extractJsonField', () => {
  it('returns the field value for an existing field', () => {
    expect(extractJsonField<number>('{"value":3}', 'value')).toBe(3);
  });

  it('returns undefined for a missing field', () => {
    expect(extractJsonField<number>('{"value":3}', 'missing')).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    expect(extractJsonField<number>('{"value":', 'value')).toBeUndefined();
  });
});

describe('parseWithSchema', () => {
  it('returns the validated value for valid input', () => {
    const schema = z.object({ value: z.number() });

    expect(parseWithSchema('{"value":4}', schema)).toEqual({ value: 4 });
  });

  it('returns undefined for invalid input', () => {
    const schema = z.object({ value: z.number() });

    expect(parseWithSchema('{"value":"nope"}', schema)).toBeUndefined();
  });
});
