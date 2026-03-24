import { describe, expect, it } from 'vitest';
import type { LLMMessage } from '../../src/types.js';
import {
  mapMessagesSimple,
  mapMessagesToOpenAI,
} from '../../src/providers/message-mapping.js';

describe('message mapping', () => {
  it('maps all message roles correctly for OpenAI-compatible providers', () => {
    const toolCalls: NonNullable<LLMMessage['tool_calls']> = [
      {
        id: 'call-1',
        type: 'function',
        function: {
          name: 'lookup_weather',
          arguments: '{"city":"Paris"}',
        },
      },
    ];

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are helpful.', name: 'system-guide' },
      { role: 'user', content: 'Hello there', name: 'player' },
      {
        role: 'assistant',
        content: 'Calling a tool',
        name: 'npc',
        tool_calls: toolCalls,
      },
      {
        role: 'tool',
        content: 'It is sunny',
        tool_call_id: 'call-1',
      },
    ];

    expect(mapMessagesToOpenAI(messages)).toEqual([
      { role: 'system', content: 'You are helpful.', name: 'system-guide' },
      { role: 'user', content: 'Hello there', name: 'player' },
      {
        role: 'assistant',
        content: 'Calling a tool',
        name: 'npc',
        tool_calls: toolCalls,
      },
      {
        role: 'tool',
        content: 'It is sunny',
        tool_call_id: 'call-1',
      },
    ]);
  });

  it('preserves tool calls, names, and tool_call_id fields', () => {
    const messages: LLMMessage[] = [
      {
        role: 'assistant',
        content: 'Using a tool',
        name: 'assistant-name',
        tool_calls: [
          {
            id: 'call-99',
            type: 'function',
            function: {
              name: 'get_location_info',
              arguments: '{"locationId":"loc-99"}',
            },
          },
        ],
      },
      {
        role: 'tool',
        content: 'Location details',
        tool_call_id: 'call-99',
      },
    ];

    const mapped = mapMessagesToOpenAI(messages);

    expect(mapped[0]).toMatchObject({
      role: 'assistant',
      name: 'assistant-name',
      tool_calls: [
        {
          id: 'call-99',
          type: 'function',
          function: {
            name: 'get_location_info',
            arguments: '{"locationId":"loc-99"}',
          },
        },
      ],
    });
    expect(mapped[1]).toEqual({
      role: 'tool',
      content: 'Location details',
      tool_call_id: 'call-99',
    });
  });

  it('maps tool messages to assistant messages for simplified providers', () => {
    const messages: LLMMessage[] = [
      { role: 'tool', content: 'tool output', tool_call_id: 'call-1' },
      { role: 'assistant', content: 'assistant output' },
    ];

    expect(mapMessagesSimple(messages)).toEqual([
      { role: 'assistant', content: 'tool output' },
      { role: 'assistant', content: 'assistant output' },
    ]);
  });

  it('handles empty message arrays', () => {
    expect(mapMessagesToOpenAI([])).toEqual([]);
    expect(mapMessagesSimple([])).toEqual([]);
  });

  it('handles null content edge cases', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: null },
      { role: 'user', content: null },
      { role: 'assistant', content: null },
      { role: 'tool', content: null, tool_call_id: 'call-null' },
    ];

    expect(mapMessagesToOpenAI(messages)).toEqual([
      { role: 'system', content: '' },
      { role: 'user', content: '' },
      { role: 'assistant', content: null },
      { role: 'tool', content: '', tool_call_id: 'call-null' },
    ]);
    expect(mapMessagesSimple(messages)).toEqual([
      { role: 'system', content: '' },
      { role: 'user', content: '' },
      { role: 'assistant', content: '' },
      { role: 'assistant', content: '' },
    ]);
  });
});
