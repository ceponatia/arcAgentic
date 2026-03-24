import { vi } from 'vitest';

export function createSelectChain<TResult>(
  result: TResult,
  terminal: 'where' | 'limit' | 'orderBy' | 'offset' = 'limit'
) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => (terminal === 'where' ? Promise.resolve(result) : chain)),
    limit: vi.fn(() => (terminal === 'limit' ? Promise.resolve(result) : chain)),
    orderBy: vi.fn(() => (terminal === 'orderBy' ? Promise.resolve(result) : chain)),
    offset: vi.fn(() => Promise.resolve(result)),
    $dynamic: vi.fn(() => chain),
  };

  return chain;
}

export function createInsertChain<TResult>(
  result: TResult,
  terminal: 'returning' | 'onConflictDoNothing' | 'onConflictDoUpdate' = 'returning'
) {
  const chain = {
    values: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(result)),
    onConflictDoNothing: vi.fn(() =>
      terminal === 'onConflictDoNothing' ? Promise.resolve(result) : chain
    ),
    onConflictDoUpdate: vi.fn(() =>
      terminal === 'onConflictDoUpdate' ? Promise.resolve(result) : chain
    ),
  };

  return chain;
}

export function createUpdateChain<TResult>(
  result: TResult,
  terminal: 'where' | 'returning' = 'returning'
) {
  const chain = {
    set: vi.fn(() => chain),
    where: vi.fn(() => (terminal === 'where' ? Promise.resolve(result) : chain)),
    returning: vi.fn(() => Promise.resolve(result)),
  };

  return chain;
}

export function createDeleteChain<TResult>(result: TResult) {
  return {
    where: vi.fn(() => Promise.resolve(result)),
  };
}
