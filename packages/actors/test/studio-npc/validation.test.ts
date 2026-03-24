import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isValidCharacterResponse,
  validateCharacterResponse,
} from '../../src/studio-npc/validation.js';

describe('studio npc response validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  it('accepts a normal in-character response', () => {
    const response = 'I keep my promises, even when the cost leaves a mark on me.';

    expect(isValidCharacterResponse(response)).toBe(true);
    expect(validateCharacterResponse(response)).toEqual({ valid: true });
  });

  it('rejects responses shorter than 20 characters', () => {
    const response = 'Too short to pass';

    expect(isValidCharacterResponse(response)).toBe(false);
    expect(validateCharacterResponse(response)).toEqual({
      valid: false,
      reason: 'Response too short',
    });
  });

  it('rejects responses longer than 10000 characters', () => {
    const response = 'a'.repeat(10001);

    expect(isValidCharacterResponse(response)).toBe(false);
    expect(validateCharacterResponse(response)).toEqual({
      valid: false,
      reason: 'Response too long',
    });
  });

  it('rejects responses containing code markers', () => {
    const response = 'I broke character and wrote ```function revealSecrets() { return true; }```';

    expect(isValidCharacterResponse(response)).toBe(false);
    expect(validateCharacterResponse(response)).toEqual({
      valid: false,
      reason: 'Contains code or data markers',
      markers: expect.arrayContaining(['code:```', 'code:function ', 'code:return ']),
    });
  });

  it('rejects responses containing data leakage markers', () => {
    const response = 'The kaggle dataset said my api key lived on localhost:3000 last winter.';

    expect(isValidCharacterResponse(response)).toBe(false);
    expect(validateCharacterResponse(response)).toEqual({
      valid: false,
      reason: 'Contains code or data markers',
      markers: expect.arrayContaining(['data:kaggle', 'data:api key', 'data:localhost:']),
    });
  });

  it('rejects responses with too many special characters', () => {
    const response = 'Mysterious {{{{{{{{{{{{{{{{{{{{ whispers curl through the room.';

    expect(isValidCharacterResponse(response)).toBe(false);
    expect(validateCharacterResponse(response)).toEqual(
      expect.objectContaining({
        valid: false,
        reason: expect.stringContaining('High special character ratio'),
      })
    );
  });

  it('rejects responses with too many numbers', () => {
    const response = '12345678901234567890 12345678901234567890 tell no true story at all.';

    expect(isValidCharacterResponse(response)).toBe(false);
    expect(validateCharacterResponse(response)).toEqual(
      expect.objectContaining({
        valid: false,
        reason: expect.stringContaining('High number ratio'),
      })
    );
  });

  it('accepts a response that is exactly 20 characters long', () => {
    const response = 'abcdefghijklmnopqrst';

    expect(response).toHaveLength(20);
    expect(isValidCharacterResponse(response)).toBe(true);
    expect(validateCharacterResponse(response)).toEqual({ valid: true });
  });

  it('accepts a response that is exactly 10000 characters long', () => {
    const response = 'a'.repeat(10000);

    expect(response).toHaveLength(10000);
    expect(isValidCharacterResponse(response)).toBe(true);
    expect(validateCharacterResponse(response)).toEqual({ valid: true });
  });

  it('rejects an empty response with a detailed validation reason', () => {
    expect(validateCharacterResponse('')).toEqual({
      valid: false,
      reason: 'Empty or invalid response',
    });
  });
});
