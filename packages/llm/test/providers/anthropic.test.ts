import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import type { LLMMessage } from '../../src/types.js';

const anthropicMock = vi.hoisted(() => {
  const create = vi.fn();
  const constructor = vi.fn(function MockAnthropic(this: unknown, config: unknown) {
    return {
      config,
      messages: {
        create,
      },
    };
  });

  return { create, constructor };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: anthropicMock.constructor,
}));

import {
  AnthropicProvider,
  extractFirstText,
  splitSystem,
} from '../../src/providers/anthropic.js';

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets constructor fields and Anthropic client config correctly', () => {
    const provider = new AnthropicProvider({
      id: 'anthropic-test',
      apiKey: 'anthropic-key',
      model: 'claude-3-7-sonnet',
    });

    expect(provider.id).toBe('anthropic-test');
    expect((provider as unknown as { model: string }).model).toBe('claude-3-7-sonnet');
    expect(provider.supportsTools).toBe(true);
    expect(provider.supportsFunctions).toBe(false);
    expect(anthropicMock.constructor).toHaveBeenCalledWith({ apiKey: 'anthropic-key' });
  });

  it('splitSystem separates the first system message from the remaining messages', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ];

    expect(splitSystem(messages)).toEqual({
      system: 'System prompt',
      nonSystem: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ],
    });
  });

  it('extractFirstText returns the first text block and null when no text exists', () => {
    expect(
      extractFirstText([
        { type: 'tool_use', text: 'ignored' },
        { type: 'text', text: 'Primary text' },
        { type: 'text', text: 'Secondary text' },
      ])
    ).toBe('Primary text');
    expect(extractFirstText([{ type: 'tool_use' }])).toBeNull();
  });

  it('chat maps messages, splits system prompts, and normalizes the response', async () => {
    anthropicMock.create.mockResolvedValue({
      id: 'msg_123',
      content: [
        { type: 'tool_use', id: 'tool-1' },
        { type: 'text', text: 'Anthropic response' },
      ],
      usage: {
        input_tokens: 21,
        output_tokens: 13,
      },
    });

    const provider = new AnthropicProvider({
      id: 'anthropic-test',
      apiKey: 'anthropic-key',
      model: 'claude-3-7-sonnet',
    });

    const response = await Effect.runPromise(
      provider.chat(
        [
          { role: 'system', content: 'You are a narrator.' },
          { role: 'user', content: 'Describe the market.' },
          { role: 'assistant', content: 'Sure.' },
        ],
        {
          max_tokens: 128,
          temperature: 0.4,
          top_p: 0.9,
          stop: ['END'],
        }
      )
    );

    expect(anthropicMock.create).toHaveBeenCalledWith({
      model: 'claude-3-7-sonnet',
      max_tokens: 128,
      system: 'You are a narrator.',
      messages: [
        { role: 'user', content: 'Describe the market.' },
        { role: 'assistant', content: 'Sure.' },
      ],
      temperature: 0.4,
      top_p: 0.9,
      stop_sequences: ['END'],
    });
    expect(response).toEqual({
      id: 'msg_123',
      content: 'Anthropic response',
      tool_calls: null,
      usage: {
        prompt_tokens: 21,
        completion_tokens: 13,
        total_tokens: 34,
      },
    });
  });

  it('surfaces Anthropic SDK failures through the Effect error channel', async () => {
    anthropicMock.create.mockRejectedValue(new Error('Anthropic failure'));

    const provider = new AnthropicProvider({
      id: 'anthropic-test',
      apiKey: 'anthropic-key',
      model: 'claude-3-7-sonnet',
    });

    await expect(
      Effect.runPromise(provider.chat([{ role: 'user', content: 'Fail please.' }]))
    ).rejects.toThrow('Anthropic failure');
  });
});
