import { err, ok } from '../src/types.js';

describe('Result helpers', () => {
  it('ok creates a successful result with ok: true', () => {
    expect(ok(123)).toEqual({ ok: true, value: 123 });
  });

  it('err creates a failed result with ok: false', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });

  it('results can be discriminated by the ok field', () => {
    const success = ok('value');
    const failure = err('boom');

    const successValue = success.ok ? success.value : 'unreachable';
    const failureValue = failure.ok ? 'unreachable' : failure.error;

    expect(successValue).toBe('value');
    expect(failureValue).toBe('boom');
  });
});
