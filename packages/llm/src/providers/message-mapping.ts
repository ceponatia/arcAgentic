import type { OpenAI } from 'openai';
import type { LLMMessage } from '../types.js';

type OpenAIMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Full-fidelity mapping for OpenAI-compatible APIs that support tools.
 */
export function mapMessagesToOpenAI(
  messages: LLMMessage[],
): OpenAIMessageParam[] {
  return messages.map((message): OpenAIMessageParam => {
    switch (message.role) {
      case 'tool':
        return {
          role: 'tool',
          content: message.content ?? '',
          tool_call_id: message.tool_call_id ?? '',
        };
      case 'assistant':
        return {
          role: 'assistant',
          content: message.content,
          ...(typeof message.name === 'string' ? { name: message.name } : {}),
          ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
        };
      case 'system':
        return {
          role: 'system',
          content: message.content ?? '',
          ...(typeof message.name === 'string' ? { name: message.name } : {}),
        };
      case 'user':
        return {
          role: 'user',
          content: message.content ?? '',
          ...(typeof message.name === 'string' ? { name: message.name } : {}),
        };
    }
  });
}

/**
 * Simplified mapping for providers that don't support tools (e.g., Ollama).
 * Tool messages are mapped to assistant messages.
 */
export function mapMessagesSimple(
  messages: LLMMessage[],
): OpenAIMessageParam[] {
  return messages.map((message): OpenAIMessageParam => {
    switch (message.role) {
      case 'tool':
        return { role: 'assistant', content: message.content ?? '' };
      case 'assistant':
        return { role: 'assistant', content: message.content ?? '' };
      case 'system':
        return { role: 'system', content: message.content ?? '' };
      case 'user':
        return { role: 'user', content: message.content ?? '' };
    }
  });
}
