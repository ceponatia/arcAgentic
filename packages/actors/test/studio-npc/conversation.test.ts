import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';

import { mockLlmProvider } from '../../../../config/vitest/mocks/llm.js';
import { ConversationManager } from '../../src/studio-npc/conversation.js';
import type { ConversationMessage } from '../../src/studio-npc/types.js';

function createMessage(
  id: number,
  role: ConversationMessage['role'] = 'user',
  content = `message-${id}`
): ConversationMessage {
  return {
    id: `msg-${id}`,
    role,
    content,
    timestamp: new Date(`2025-01-01T00:00:${String(id).padStart(2, '0')}Z`),
  };
}

function addConversationalMessages(manager: ConversationManager, count: number): void {
  for (let index = 1; index <= count; index += 1) {
    manager.addMessage(
      createMessage(index, index % 2 === 0 ? 'character' : 'user', `conversation-${index}`)
    );
  }
}

describe('ConversationManager', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no messages initially', () => {
    const manager = new ConversationManager({ llmProvider: mockLlmProvider() });

    expect(manager.getAllMessages()).toEqual([]);
  });

  it('returns a null summary initially', () => {
    const manager = new ConversationManager({ llmProvider: mockLlmProvider() });

    expect(manager.getSummary()).toBeNull();
  });

  it('adds messages to the conversation list', () => {
    const manager = new ConversationManager({ llmProvider: mockLlmProvider() });
    const message = createMessage(1, 'user', 'Tell me who you are.');

    manager.addMessage(message);

    expect(manager.getAllMessages()).toEqual([message]);
  });

  it('preserves message count and order across multiple additions', () => {
    const manager = new ConversationManager({ llmProvider: mockLlmProvider() });
    addConversationalMessages(manager, 4);

    expect(manager.getAllMessages().map(message => message.id)).toEqual([
      'msg-1',
      'msg-2',
      'msg-3',
      'msg-4',
    ]);
  });

  it('returns the last 20 conversational messages in the context window', () => {
    const manager = new ConversationManager({ llmProvider: mockLlmProvider() });
    manager.addMessage(createMessage(0, 'system', 'Internal note'));
    addConversationalMessages(manager, 25);

    const window = manager.getContextWindow();

    expect(window).toHaveLength(20);
    expect(window[0]?.id).toBe('msg-6');
    expect(window.at(-1)?.id).toBe('msg-25');
    expect(window.every(message => message.role !== 'system')).toBe(true);
  });

  it('does not require summarization below the threshold', () => {
    const manager = new ConversationManager({ llmProvider: mockLlmProvider() });
    addConversationalMessages(manager, 19);

    expect(manager.needsSummarization()).toBe(false);
  });

  it('requires summarization at the threshold of 20 conversational messages', () => {
    const manager = new ConversationManager({ llmProvider: mockLlmProvider() });
    addConversationalMessages(manager, 20);

    expect(manager.needsSummarization()).toBe(true);
  });

  it('builds full context from recent messages when no summary exists', () => {
    const manager = new ConversationManager({
      llmProvider: mockLlmProvider(),
      characterName: 'Mara',
    });

    manager.addMessage(createMessage(1, 'user', 'What matters to you?'));
    manager.addMessage(createMessage(2, 'character', 'Keeping my word matters most.'));

    expect(manager.getFullContext()).toBe(
      '[Recent conversation]\n\nUser: What matters to you?\n\nMara: Keeping my word matters most.'
    );
  });

  it('summarizes the conversation into structured json output', async () => {
    const llmProvider = mockLlmProvider();
    llmProvider.chat.mockReturnValue(
      Effect.succeed({
        id: 'summary-001',
        content: JSON.stringify({
          summary: 'Mara reveals a guarded loyalty and a fear of betrayal.',
          keyPoints: ['guarded loyalty', 'fear of betrayal'],
        }),
        tool_calls: null,
        usage: null,
      })
    );

    const manager = new ConversationManager({ llmProvider, characterName: 'Mara' });
    addConversationalMessages(manager, 20);

    await manager.summarize();

    expect(llmProvider.chat).toHaveBeenCalledTimes(1);
    expect(manager.getSummary()).toBe('Mara reveals a guarded loyalty and a fear of betrayal.');
  });

  it('falls back to plain text summaries when the llm response is not json', async () => {
    const llmProvider = mockLlmProvider();
    llmProvider.chat.mockReturnValue(
      Effect.succeed({
        id: 'summary-002',
        content: 'Mara is wary, loyal, and slow to trust strangers.',
        tool_calls: null,
        usage: null,
      })
    );

    const manager = new ConversationManager({ llmProvider, characterName: 'Mara' });
    addConversationalMessages(manager, 20);

    await manager.summarize();

    expect(manager.getSummary()).toBe('Mara is wary, loyal, and slow to trust strangers.');
  });

  it('does not summarize or call the llm below the threshold', async () => {
    const llmProvider = mockLlmProvider();
    const manager = new ConversationManager({ llmProvider });
    addConversationalMessages(manager, 10);

    await manager.summarize();

    expect(llmProvider.chat).not.toHaveBeenCalled();
    expect(manager.getSummary()).toBeNull();
  });

  it('combines the stored summary with recent messages in full context', async () => {
    const llmProvider = mockLlmProvider();
    llmProvider.chat.mockReturnValue(
      Effect.succeed({
        id: 'summary-003',
        content: JSON.stringify({
          summary: 'Mara speaks in short, guarded answers but softens around loyalty.',
          keyPoints: [],
        }),
        tool_calls: null,
        usage: null,
      })
    );

    const manager = new ConversationManager({ llmProvider, characterName: 'Mara' });
    addConversationalMessages(manager, 20);

    await manager.summarize();

    const context = manager.getFullContext();
    expect(context).toContain('[Previous conversation summary]');
    expect(context).toContain('Mara speaks in short, guarded answers but softens around loyalty.');
    expect(context).toContain('[Recent conversation]');
    expect(context).toContain('User: conversation-1');
  });

  it('clears both messages and summary state', async () => {
    const llmProvider = mockLlmProvider();
    llmProvider.chat.mockReturnValue(
      Effect.succeed({
        id: 'summary-004',
        content: JSON.stringify({
          summary: 'Mara keeps her distance.',
          keyPoints: [],
        }),
        tool_calls: null,
        usage: null,
      })
    );

    const manager = new ConversationManager({ llmProvider });
    addConversationalMessages(manager, 20);
    await manager.summarize();

    manager.clear();

    expect(manager.getAllMessages()).toEqual([]);
    expect(manager.getSummary()).toBeNull();
    expect(manager.getFullContext()).toBe('');
  });
});
