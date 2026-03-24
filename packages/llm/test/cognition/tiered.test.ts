import { describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import type { ChatOptions, LLMMessage, LLMProvider, LLMResponse } from '../../src/types.js';
import { TieredCognitionRouter } from '../../src/cognition/tiered.js';

function createProvider(id: string, response: LLMResponse): LLMProvider {
  return {
    id,
    supportsTools: true,
    supportsFunctions: true,
    chat: vi.fn(() => Effect.succeed(response)),
    stream: vi.fn(() => Effect.die('stream not used in tiered tests')),
  };
}

describe('TieredCognitionRouter', () => {
  const messages: LLMMessage[] = [{ role: 'user', content: 'Think quickly.' }];
  const options: ChatOptions = { max_tokens: 42 };

  it('routes fast, deep, reasoning, and vision tasks to the expected providers', () => {
    const fast = createProvider('fast-provider', { id: 'fast', content: 'fast' });
    const deep = createProvider('deep-provider', { id: 'deep', content: 'deep' });
    const reasoning = createProvider('reasoning-provider', { id: 'reasoning', content: 'reasoning' });
    const router = new TieredCognitionRouter({ fast, deep, reasoning });

    expect(router.route({ type: 'fast', messages })).toBe(fast);
    expect(router.route({ type: 'deep', messages })).toBe(deep);
    expect(router.route({ type: 'reasoning', messages })).toBe(reasoning);
    expect(router.route({ type: 'vision', messages })).toBe(deep);
  });

  it('execute calls the routed provider chat method and resolves via Effect.runPromise', async () => {
    const fast = createProvider('fast-provider', { id: 'fast', content: 'fast' });
    const deep = createProvider('deep-provider', { id: 'deep', content: 'deep result' });
    const reasoning = createProvider('reasoning-provider', { id: 'reasoning', content: 'reasoning' });
    const router = new TieredCognitionRouter({ fast, deep, reasoning });

    const result = await Effect.runPromise(
      router.execute({
        type: 'vision',
        messages,
        options,
      })
    );

    expect(deep.chat).toHaveBeenCalledWith(messages, options);
    expect(fast.chat).not.toHaveBeenCalled();
    expect(reasoning.chat).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'deep', content: 'deep result' });
  });
});
