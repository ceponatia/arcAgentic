import { Effect } from 'effect';
import { buildMovedEffect } from '../../../../config/vitest/builders/world-event.js';
import { mockBus } from '../../../../config/vitest/mocks/bus.js';
import { createCognitionProcessor } from '../../src/processors/cognition.js';

function createCognitionJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      sessionId: 'session-001',
      payload: {
        actorId: 'npc-001',
        context: {
          lastEvents: [buildMovedEffect({ actorId: 'npc-002' })],
          availableTools: ['speak'],
          memoryContext: 'Remembers the market square.',
        },
      },
    },
    id: 'job-001',
    name: 'think',
    ...overrides,
  };
}

describe('createCognitionProcessor', () => {
  it('builds the LLM task with actor context and serialized world events', async () => {
    const bus = mockBus();
    const router = {
      execute: vi.fn().mockReturnValue(Effect.succeed({ content: 'Hello there' })),
    };
    const job = createCognitionJob();
    const processor = createCognitionProcessor(bus as never, router as never);

    await processor(job as never);

    expect(router.execute).toHaveBeenCalledWith({
      type: 'fast',
      messages: [
        {
          role: 'system',
          content: 'You are NPC npc-001. Context: Remembers the market square..',
        },
        {
          role: 'user',
          content: JSON.stringify(job.data.payload.context.lastEvents[0]),
        },
      ],
    });
  });

  it('uses a default no-memory prompt when memory context is absent', async () => {
    const bus = mockBus();
    const router = {
      execute: vi.fn().mockReturnValue(Effect.succeed({ content: 'Hello there' })),
    };
    const processor = createCognitionProcessor(bus as never, router as never);

    await processor(
      createCognitionJob({
        data: {
          sessionId: 'session-001',
          payload: {
            actorId: 'npc-001',
            context: {
              lastEvents: [],
              availableTools: [],
            },
          },
        },
      }) as never
    );

    expect(router.execute).toHaveBeenCalledWith({
      type: 'fast',
      messages: [
        {
          role: 'system',
          content: 'You are NPC npc-001. Context: No memory.',
        },
      ],
    });
  });

  it('emits a SPEAK_INTENT with actorId, sessionId, and response content', async () => {
    const bus = mockBus();
    const router = {
      execute: vi.fn().mockReturnValue(Effect.succeed({ content: 'Hello there' })),
    };
    const processor = createCognitionProcessor(bus as never, router as never);

    await processor(createCognitionJob() as never);

    expect(bus.emit).toHaveBeenCalledWith({
      type: 'SPEAK_INTENT',
      actorId: 'npc-001',
      content: 'Hello there',
      sessionId: 'session-001',
    });
  });

  it('returns success and one emitted event when the LLM call and emit both succeed', async () => {
    const bus = mockBus();
    const router = {
      execute: vi.fn().mockReturnValue(Effect.succeed({ content: 'Hello there' })),
    };
    const processor = createCognitionProcessor(bus as never, router as never);

    const result = await processor(createCognitionJob() as never);

    expect(result).toEqual({
      success: true,
      eventsEmitted: 1,
    });
  });

  it('returns a failure result when the router effect fails', async () => {
    const bus = mockBus();
    const router = {
      execute: vi.fn().mockReturnValue(Effect.fail(new Error('LLM offline'))),
    };
    const processor = createCognitionProcessor(bus as never, router as never);

    const result = await processor(createCognitionJob() as never);

    expect(result).toEqual({
      success: false,
      error: 'LLM offline',
    });
  });

  it('returns a failure result when the LLM response content is empty', async () => {
    const bus = mockBus();
    const router = {
      execute: vi.fn().mockReturnValue(Effect.succeed({ content: '' })),
    };
    const processor = createCognitionProcessor(bus as never, router as never);

    const result = await processor(createCognitionJob() as never);

    expect(result).toEqual({
      success: false,
      error: 'LLM returned empty response',
    });
  });

  it('returns a failure result when emitting the speak intent fails', async () => {
    const bus = mockBus();
    bus.emit.mockRejectedValueOnce(new Error('bus unavailable'));
    const router = {
      execute: vi.fn().mockReturnValue(Effect.succeed({ content: 'Hello there' })),
    };
    const processor = createCognitionProcessor(bus as never, router as never);

    const result = await processor(createCognitionJob() as never);

    expect(result).toEqual({
      success: false,
      error: 'bus unavailable',
    });
  });
});
