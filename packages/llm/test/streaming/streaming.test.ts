import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import type { LLMStreamChunk } from '../../src/types.js';
import { consumeStream, streamToLines } from '../../src/streaming/index.js';

function makeAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of stream) {
    items.push(item);
  }
  return items;
}

describe('streaming utilities', () => {
  it('streamToLines extracts content deltas from chunks', async () => {
    const chunks: LLMStreamChunk[] = [
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' world' } }] },
    ];

    await expect(collect(streamToLines(makeAsyncIterable(chunks)))).resolves.toEqual([
      'Hello',
      ' world',
    ]);
  });

  it('streamToLines skips null or empty content deltas', async () => {
    const chunks: LLMStreamChunk[] = [
      { choices: [{ delta: { content: null } }] },
      { choices: [{ delta: {} }] },
      { choices: [{ delta: { content: '' } }] },
      { choices: [{ delta: { content: 'kept' } }] },
    ];

    await expect(collect(streamToLines(makeAsyncIterable(chunks)))).resolves.toEqual(['kept']);
  });

  it('consumeStream concatenates all string chunks', async () => {
    const result = await Effect.runPromise(
      consumeStream(makeAsyncIterable(['The ', 'wind ', 'shifts.']))
    );

    expect(result).toBe('The wind shifts.');
  });

  it('consumeStream works with Effect.runPromise', async () => {
    const lines = streamToLines(
      makeAsyncIterable<LLMStreamChunk>([
        { choices: [{ delta: { content: 'A' } }] },
        { choices: [{ delta: { content: 'B' } }] },
      ])
    );

    await expect(Effect.runPromise(consumeStream(lines))).resolves.toBe('AB');
  });

  it('handles an empty stream', async () => {
    await expect(collect(streamToLines(makeAsyncIterable<LLMStreamChunk>([])))).resolves.toEqual([]);
    await expect(Effect.runPromise(consumeStream(makeAsyncIterable<string>([])))).resolves.toBe('');
  });

  it('handles a single chunk stream', async () => {
    await expect(
      collect(streamToLines(makeAsyncIterable<LLMStreamChunk>([
        { choices: [{ delta: { content: 'single' } }] },
      ])))
    ).resolves.toEqual(['single']);
    await expect(
      Effect.runPromise(consumeStream(makeAsyncIterable(['single'])))
    ).resolves.toBe('single');
  });
});
