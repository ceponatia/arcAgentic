import { getErrorMessage, isAbortError } from '../src/errors/index.js';

describe('getErrorMessage', () => {
  it('extracts a message from an Error object', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('extracts a message from an object with a message property', () => {
    expect(getErrorMessage({ message: 'boom' })).toBe('boom');
  });

  it('returns the fallback for null and undefined', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('returns trimmed strings and falls back for other non-error values', () => {
    expect(getErrorMessage('  boom  ')).toBe('boom');
    expect(getErrorMessage(42, 'fallback')).toBe('fallback');
  });
});

describe('isAbortError', () => {
  it('returns true for AbortError instances', () => {
    const error =
      typeof DOMException !== 'undefined'
        ? new DOMException('Aborted', 'AbortError')
        : Object.assign(new Error('Aborted'), { name: 'AbortError' });

    expect(isAbortError(error)).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isAbortError(new Error('boom'))).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});
