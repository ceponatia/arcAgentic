const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const dbNodeMock = vi.hoisted(() => ({
  updateNodeEmbedding: vi.fn(),
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

vi.mock('@arcagentic/db/node', () => dbNodeMock);

import { createEmbeddingProcessor } from '../../src/processors/embedding.js';

const mockEmbeddingProvider = {
  embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
};

function createEmbeddingJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      sessionId: 'session-001',
      payload: {
        nodeId: 'node-001',
        text: 'Some text to embed',
      },
    },
    id: 'job-001',
    name: 'embed',
    ...overrides,
  };
}

describe('createEmbeddingProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbNodeMock.updateNodeEmbedding.mockResolvedValue({ id: 'node-001' });
  });

  it('returns success for a valid embedding payload', async () => {
    const processor = createEmbeddingProcessor(mockEmbeddingProvider);

    const result = await processor(createEmbeddingJob() as never);

    expect(result).toEqual({ success: true });
    expect(mockEmbeddingProvider.embed).toHaveBeenCalledWith(['Some text to embed']);
    expect(dbNodeMock.updateNodeEmbedding).toHaveBeenCalledWith('node-001', [0.1, 0.2, 0.3]);
  });

  it('logs the node id and text length for valid embedding work', async () => {
    const processor = createEmbeddingProcessor(mockEmbeddingProvider);

    await processor(createEmbeddingJob() as never);

    expect(loggerMock.info).toHaveBeenCalledWith(
      { nodeId: 'node-001', textLength: 18 },
      'generating embedding'
    );
  });

  it('returns a failure result when payload is missing', async () => {
    const processor = createEmbeddingProcessor(mockEmbeddingProvider);

    await expect(
      processor(
        createEmbeddingJob({
          data: {
            sessionId: 'session-001',
            payload: undefined,
          },
        }) as never
      )
    ).resolves.toEqual({
      success: false,
      error: 'Missing embedding payload',
    });
  });

  it('returns a failure result when payload text is missing', async () => {
    const processor = createEmbeddingProcessor(mockEmbeddingProvider);

    await expect(
      processor(
        createEmbeddingJob({
          data: {
            sessionId: 'session-001',
            payload: {
              nodeId: 'node-001',
            },
          },
        }) as never
      )
    ).resolves.toEqual({
      success: false,
      error: 'Missing embedding payload',
    });
  });

  it('handles malformed jobs without throwing', async () => {
    const processor = createEmbeddingProcessor(mockEmbeddingProvider);

    await expect(processor({ data: undefined } as never)).resolves.toEqual({
      success: false,
      error: 'Missing embedding payload',
    });
  });

  it('returns a failure result when the embedding provider throws', async () => {
    const processor = createEmbeddingProcessor(mockEmbeddingProvider);
    mockEmbeddingProvider.embed.mockRejectedValueOnce(new Error('embedding provider offline'));

    const result = await processor(createEmbeddingJob() as never);

    expect(result).toEqual({
      success: false,
      error: 'embedding provider offline',
    });
  });

  it('returns a failure result when updating the node embedding fails', async () => {
    const processor = createEmbeddingProcessor(mockEmbeddingProvider);
    dbNodeMock.updateNodeEmbedding.mockRejectedValueOnce(new Error('database unavailable'));

    const result = await processor(createEmbeddingJob() as never);

    expect(result).toEqual({
      success: false,
      error: 'database unavailable',
    });
  });
});
