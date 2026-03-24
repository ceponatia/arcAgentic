import {
  generateCompactUuid,
  generateId,
  generateInstanceId,
  generateLocalId,
  generatePrefixedId,
  generateShortId,
  isUuid,
} from '../../src/shared/id.js';

describe('id generation', () => {
  it('generateId returns a valid UUID string', () => {
    expect(isUuid(generateId())).toBe(true);
  });

  it('generateId returns unique values on repeated calls', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateId()));

    expect(ids.size).toBe(10);
  });

  it('generatePrefixedId returns a string starting with the prefix and dash', () => {
    const value = generatePrefixedId('char');

    expect(value).toMatch(/^char-[0-9a-f]{8}$/i);
  });

  it('generateInstanceId returns a string starting with the templateId and dash', () => {
    const value = generateInstanceId('template');

    expect(value).toMatch(/^template-/);
    expect(isUuid(value.slice('template-'.length))).toBe(true);
  });

  it('generateCompactUuid returns a UUID string without dashes', () => {
    expect(generateCompactUuid()).toMatch(/^[0-9a-f]{32}$/i);
  });

  it('generateShortId returns strings with the requested length', () => {
    expect(generateShortId()).toHaveLength(8);
    expect(generateShortId(12)).toHaveLength(12);
  });

  it('generateLocalId returns a string with the prefix and underscore', () => {
    expect(generateLocalId('row')).toMatch(/^row_[0-9a-f]{12}$/i);
  });
});

describe('isUuid', () => {
  it('returns true for a valid UUID', () => {
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });

  it('returns false for a non-UUID string', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isUuid('')).toBe(false);
  });
});
