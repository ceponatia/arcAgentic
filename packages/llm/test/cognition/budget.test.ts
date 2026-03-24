import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { TokenBudgetManager } from '../../src/cognition/budget.js';

describe('TokenBudgetManager', () => {
  it('getBudget creates a default budget for a new session id', () => {
    const manager = new TokenBudgetManager();

    expect(manager.getBudget('session-001')).toEqual({
      sessionId: 'session-001',
      limit: 100000,
      used: 0,
      remaining: 100000,
    });
  });

  it('updateUsage increments used tokens and decrements remaining', () => {
    const manager = new TokenBudgetManager();

    const updated = Effect.runSync(manager.updateUsage('session-001', 1250));

    expect(updated).toEqual({
      sessionId: 'session-001',
      limit: 100000,
      used: 1250,
      remaining: 98750,
    });
    expect(manager.getBudget('session-001')).toEqual(updated);
  });

  it('hasBudget returns true when usage is under the limit', () => {
    const manager = new TokenBudgetManager();

    Effect.runSync(manager.updateUsage('session-001', 500));

    expect(manager.hasBudget('session-001', 100)).toBe(true);
  });

  it('hasBudget returns false when usage is over the limit', () => {
    const manager = new TokenBudgetManager(1000);

    Effect.runSync(manager.updateUsage('session-001', 950));

    expect(manager.hasBudget('session-001', 100)).toBe(false);
  });

  it('resetBudget clears the session budget', () => {
    const manager = new TokenBudgetManager();

    Effect.runSync(manager.updateUsage('session-001', 750));
    manager.resetBudget('session-001');

    expect(manager.getBudget('session-001')).toEqual({
      sessionId: 'session-001',
      limit: 100000,
      used: 0,
      remaining: 100000,
    });
  });

  it('supports a custom default limit', () => {
    const manager = new TokenBudgetManager(5000);

    expect(manager.getBudget('session-001')).toEqual({
      sessionId: 'session-001',
      limit: 5000,
      used: 0,
      remaining: 5000,
    });
  });
});
