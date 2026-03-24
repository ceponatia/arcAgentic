import { z } from 'zod';
import { parseJson, parseJsonWithSchema } from '../../src/parsers/index.js';

describe('parseJson', () => {
  it('returns the parsed object for valid JSON', () => {
    expect(parseJson('{"value":1}')).toEqual({ value: 1 });
  });

  it('throws for invalid JSON', () => {
    expect(() => parseJson('{"value":')).toThrow();
  });
});

describe('parseJsonWithSchema', () => {
  it('validates against the provided schema', () => {
    const schema = z.object({ value: z.number() });

    expect(parseJsonWithSchema('{"value":1}', schema)).toEqual({ value: 1 });
  });

  it('rejects invalid data', () => {
    const schema = z.object({ value: z.number() });

    expect(() => parseJsonWithSchema('{"value":"one"}', schema)).toThrow();
  });
});
