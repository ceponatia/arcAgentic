import { safeJson, safeText } from '../src/http/index.js';

describe('safeText', () => {
  it('returns text from a successful response', async () => {
    const response = {
      text: vi.fn().mockResolvedValue('hello'),
    };

    await expect(safeText(response)).resolves.toBe('hello');
  });

  it('returns the fallback when response.text throws', async () => {
    const response = {
      text: vi.fn().mockRejectedValue(new Error('failed')),
    };

    await expect(safeText(response)).resolves.toBe('<no body>');
  });
});

describe('safeJson', () => {
  it('returns parsed JSON from a successful response', async () => {
    const response = {
      json: vi.fn().mockResolvedValue({ value: 1 }),
    };

    await expect(safeJson<{ value: number }>(response)).resolves.toEqual({ value: 1 });
  });

  it('returns null when response.json throws', async () => {
    const response = {
      json: vi.fn().mockRejectedValue(new Error('failed')),
    };

    await expect(safeJson(response)).resolves.toBeNull();
  });
});
