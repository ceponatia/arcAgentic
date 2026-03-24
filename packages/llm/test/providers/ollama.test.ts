import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';

const openAiMock = vi.hoisted(() => {
  const create = vi.fn();
  const constructor = vi.fn(function MockOpenAI(this: unknown, config: unknown) {
    return {
      config,
      chat: {
        completions: {
          create,
        },
      },
    };
  });

  return { create, constructor };
});

vi.mock('openai', () => ({
  OpenAI: openAiMock.constructor,
  default: openAiMock.constructor,
}));

import { OllamaProvider } from '../../src/providers/ollama.js';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses default constructor settings for Ollama', () => {
    const provider = new OllamaProvider({
      id: 'ollama-test',
      model: 'llama3.2',
    });

    expect(provider.id).toBe('ollama-test');
    expect((provider as unknown as { model: string }).model).toBe('llama3.2');
    expect(provider.supportsTools).toBe(false);
    expect(provider.supportsFunctions).toBe(false);
    expect(openAiMock.constructor).toHaveBeenCalledWith({
      apiKey: 'ollama',
      baseURL: 'http://localhost:11434/v1',
    });
  });

  it('uses simplified message mapping and normalizes chat responses', async () => {
    openAiMock.create.mockResolvedValue({
      id: 'ollama-123',
      choices: [{ message: { content: 'Simplified response' } }],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 6,
        total_tokens: 15,
      },
    });

    const provider = new OllamaProvider({
      id: 'ollama-test',
      model: 'llama3.2',
      baseURL: 'http://ollama.example.test/v1',
    });

    const response = await Effect.runPromise(
      provider.chat(
        [
          { role: 'system', content: 'You are concise.' },
          { role: 'user', content: 'What do you smell?' },
          { role: 'tool', content: 'Fresh bread', tool_call_id: 'tool-1' },
        ],
        {
          temperature: 0.2,
          max_tokens: 64,
          stop: ['END'],
        }
      )
    );

    expect(openAiMock.constructor).toHaveBeenCalledWith({
      apiKey: 'ollama',
      baseURL: 'http://ollama.example.test/v1',
    });
    expect(openAiMock.create).toHaveBeenCalledWith({
      model: 'llama3.2',
      messages: [
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'What do you smell?' },
        { role: 'assistant', content: 'Fresh bread' },
      ],
      temperature: 0.2,
      max_tokens: 64,
      stop: ['END'],
    });
    expect(response).toEqual({
      id: 'ollama-123',
      content: 'Simplified response',
      tool_calls: null,
      usage: {
        prompt_tokens: 9,
        completion_tokens: 6,
        total_tokens: 15,
      },
    });
  });
});
