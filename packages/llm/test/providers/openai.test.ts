import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import type { ToolDefinition } from '@arcagentic/schemas';
import type { LLMMessage, LLMStreamChunk } from '../../src/types.js';

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

import {
  OpenAIProvider,
  createOpenRouterProviderFromEnv,
} from '../../src/providers/openai.js';

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

describe('OpenAIProvider', () => {
  const messages: LLMMessage[] = [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Tell me about the town.' },
    {
      role: 'assistant',
      content: 'Let me check.',
      tool_calls: [
        {
          id: 'call-1',
          type: 'function',
          function: {
            name: 'get_location_info',
            arguments: '{"locationId":"town-square"}',
          },
        },
      ],
    },
    { role: 'tool', content: 'The town square is busy.', tool_call_id: 'call-1' },
  ];

  const tools: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'get_location_info',
        description: 'Get details about a location.',
        parameters: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'The location identifier.',
            },
          },
          required: ['locationId'],
        },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sets constructor fields and OpenAI client config correctly', () => {
    const provider = new OpenAIProvider({
      id: 'openai-test',
      apiKey: 'test-key',
      model: 'gpt-4.1-mini',
      baseURL: 'https://api.example.test/v1',
    });

    expect(provider.id).toBe('openai-test');
    expect((provider as unknown as { model: string }).model).toBe('gpt-4.1-mini');
    expect(provider.supportsTools).toBe(true);
    expect(provider.supportsFunctions).toBe(true);
    expect(openAiMock.constructor).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: 'https://api.example.test/v1',
    });
  });

  it('chat calls the SDK and returns a normalized LLM response', async () => {
    openAiMock.create.mockResolvedValue({
      id: 'chatcmpl-123',
      choices: [
        {
          message: {
            content: 'The town square is lively.',
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: {
                  name: 'get_location_info',
                  arguments: '{"locationId":"town-square"}',
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20,
      },
    });

    const provider = new OpenAIProvider({
      id: 'openai-test',
      apiKey: 'test-key',
      model: 'gpt-4.1-mini',
    });

    const response = await Effect.runPromise(
      provider.chat(messages, {
        temperature: 0.3,
        max_tokens: 256,
        top_p: 0.8,
        stop: ['END'],
        tools,
        tool_choice: 'auto',
        response_format: { type: 'json_object' },
      })
    );

    expect(openAiMock.create).toHaveBeenCalledWith({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Tell me about the town.' },
        {
          role: 'assistant',
          content: 'Let me check.',
          tool_calls: [
            {
              id: 'call-1',
              type: 'function',
              function: {
                name: 'get_location_info',
                arguments: '{"locationId":"town-square"}',
              },
            },
          ],
        },
        {
          role: 'tool',
          content: 'The town square is busy.',
          tool_call_id: 'call-1',
        },
      ],
      temperature: 0.3,
      max_tokens: 256,
      top_p: 0.8,
      stop: ['END'],
      tools,
      tool_choice: 'auto',
      response_format: { type: 'json_object' },
    });
    expect(response).toEqual({
      id: 'chatcmpl-123',
      content: 'The town square is lively.',
      tool_calls: [
        {
          id: 'call-1',
          type: 'function',
          function: {
            name: 'get_location_info',
            arguments: '{"locationId":"town-square"}',
          },
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20,
      },
    });
  });

  it('stream returns async iterable chunks from the SDK', async () => {
    const chunks: LLMStreamChunk[] = [
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' world' } }] },
    ];
    openAiMock.create.mockResolvedValue(makeAsyncIterable(chunks));

    const provider = new OpenAIProvider({
      id: 'openai-test',
      apiKey: 'test-key',
      model: 'gpt-4.1-mini',
    });

    const stream = await Effect.runPromise(
      provider.stream([{ role: 'user', content: 'Stream a response.' }], {
        temperature: 0.1,
        max_tokens: 32,
      })
    );

    expect(openAiMock.create).toHaveBeenCalledWith({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'Stream a response.' }],
      stream: true,
      temperature: 0.1,
      max_tokens: 32,
    });
    await expect(collect(stream)).resolves.toEqual(chunks);
  });

  it('surfaces SDK failures through the Effect error channel', async () => {
    openAiMock.create.mockRejectedValue(new Error('SDK failure'));

    const provider = new OpenAIProvider({
      id: 'openai-test',
      apiKey: 'test-key',
      model: 'gpt-4.1-mini',
    });

    await expect(
      Effect.runPromise(provider.chat([{ role: 'user', content: 'Fail please.' }]))
    ).rejects.toThrow('SDK failure');
  });

  it('createOpenRouterProviderFromEnv reads env vars and provider sort correctly', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'router-key');
    vi.stubEnv('OPENROUTER_MODEL', 'openrouter/model-test');
    vi.stubEnv('OPENROUTER_BASE_URL', 'https://openrouter.example.test/v1');
    vi.stubEnv('OPENROUTER_PROVIDER_SORT', 'latency');

    openAiMock.create.mockResolvedValue({
      id: 'chatcmpl-router',
      choices: [{ message: { content: 'Router response', tool_calls: null } }],
      usage: null,
    });

    const provider = createOpenRouterProviderFromEnv({
      id: 'openrouter-test',
      defaultModel: 'fallback-model',
    });

    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider?.id).toBe('openrouter-test');
    expect(openAiMock.constructor).toHaveBeenLastCalledWith({
      apiKey: 'router-key',
      baseURL: 'https://openrouter.example.test/v1',
    });

    await Effect.runPromise(provider!.chat([{ role: 'user', content: 'ping' }]));

    expect(openAiMock.create).toHaveBeenLastCalledWith({
      model: 'openrouter/model-test',
      messages: [{ role: 'user', content: 'ping' }],
      provider: { sort: 'latency' },
    });
  });

  it('returns null when OPENROUTER_API_KEY is missing', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');

    expect(createOpenRouterProviderFromEnv()).toBeNull();
  });
});
