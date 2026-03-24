import { buildMovedEffect } from '../../../../config/vitest/builders/world-event.js';

const queueState = vi.hoisted(() => {
  const instances = new Map<
    string,
    {
      add: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      name: string;
      options: Record<string, unknown>;
    }
  >();

  const QueueMock = vi.fn(function MockQueue(
    this: {
      add: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      name: string;
      options: Record<string, unknown>;
    },
    name: string,
    options: Record<string, unknown>
  ) {
    this.name = name;
    this.options = options;
    this.add = vi.fn().mockResolvedValue({ id: `${name}-job-id` });
    this.close = vi.fn().mockResolvedValue(undefined);

    const queue = {
      name,
      options,
      add: this.add,
      close: this.close,
    };

    instances.set(name, queue);
  });

  return {
    QueueMock,
    instances,
  };
});

vi.mock('bullmq', () => ({
  Queue: queueState.QueueMock,
  Worker: vi.fn(),
  Job: vi.fn(),
}));

vi.mock('../../src/config.js', () => ({
  connection: {
    host: 'localhost',
    port: 6379,
  },
}));

describe('queue helpers', () => {
  beforeEach(() => {
    queueState.instances.clear();
    queueState.QueueMock.mockClear();
    vi.resetModules();
  });

  it('creates cognition, tick, and embedding queues at module load', async () => {
    await import('../../src/queues/index.js');

    expect(queueState.QueueMock).toHaveBeenCalledTimes(3);
    expect(queueState.QueueMock).toHaveBeenNthCalledWith(1, 'cognition', {
      connection: { host: 'localhost', port: 6379 },
    });
    expect(queueState.QueueMock).toHaveBeenNthCalledWith(2, 'tick', {
      connection: { host: 'localhost', port: 6379 },
    });
    expect(queueState.QueueMock).toHaveBeenNthCalledWith(3, 'embedding', {
      connection: { host: 'localhost', port: 6379 },
    });
  });

  it('enqueueCognition adds a think job with high priority and the expected payload', async () => {
    const queuesModule = await import('../../src/queues/index.js');

    const result = await queuesModule.enqueueCognition('session-001', 'npc-001', {
      lastEvents: [buildMovedEffect({ actorId: 'npc-002' })],
      availableTools: ['speak'],
      memoryContext: 'Remembers the market square.',
    });

    expect(queueState.instances.get('cognition')?.add).toHaveBeenCalledWith(
      'think',
      {
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
      {
        priority: 1,
        removeOnComplete: true,
      }
    );
    expect(result).toEqual({ id: 'cognition-job-id' });
  });

  it('enqueueTick adds a tick job with the expected data shape', async () => {
    const queuesModule = await import('../../src/queues/index.js');

    const result = await queuesModule.enqueueTick('session-001', {
      tickCount: 7,
      timestamp: 1_735_689_600_000,
    });

    expect(queueState.instances.get('tick')?.add).toHaveBeenCalledWith(
      'tick',
      {
        sessionId: 'session-001',
        payload: {
          tickCount: 7,
          timestamp: 1_735_689_600_000,
        },
      },
      {
        removeOnComplete: true,
      }
    );
    expect(result).toEqual({ id: 'tick-job-id' });
  });

  it('enqueueEmbedding adds an embed job with the expected data shape', async () => {
    const queuesModule = await import('../../src/queues/index.js');

    const result = await queuesModule.enqueueEmbedding('session-001', {
      nodeId: 'node-001',
      text: 'Some text to embed',
    });

    expect(queueState.instances.get('embedding')?.add).toHaveBeenCalledWith(
      'embed',
      {
        sessionId: 'session-001',
        payload: {
          nodeId: 'node-001',
          text: 'Some text to embed',
        },
      },
      {
        removeOnComplete: true,
      }
    );
    expect(result).toEqual({ id: 'embedding-job-id' });
  });

  it('reuses the same queue instances for helper calls after module import', async () => {
    const queuesModule = await import('../../src/queues/index.js');

    await queuesModule.enqueueTick('session-001', {
      tickCount: 1,
      timestamp: 1,
    });
    await queuesModule.enqueueTick('session-002', {
      tickCount: 2,
      timestamp: 2,
    });

    expect(queueState.QueueMock).toHaveBeenCalledTimes(3);
    expect(queueState.instances.get('tick')?.add).toHaveBeenCalledTimes(2);
  });
});
