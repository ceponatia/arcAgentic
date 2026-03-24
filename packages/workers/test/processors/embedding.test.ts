const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

import { createEmbeddingProcessor } from '../../src/processors/embedding.js';

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
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns success for a valid embedding payload', async () => {
    const processor = createEmbeddingProcessor();
    const resultPromise = processor(createEmbeddingJob() as never);

    await vi.advanceTimersByTimeAsync(200);

    await expect(resultPromise).resolves.toEqual({ success: true });
  });

  it('logs the node id and text length for valid embedding work', async () => {
    const processor = createEmbeddingProcessor();
    const resultPromise = processor(createEmbeddingJob() as never);

    await vi.advanceTimersByTimeAsync(200);
    await resultPromise;

    expect(loggerMock.info).toHaveBeenCalledWith(
      { nodeId: 'node-001', textLength: 18 },
      'generating embedding'
    );
  });

  it('returns a failure result when payload is missing', async () => {
    const processor = createEmbeddingProcessor();

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
    const processor = createEmbeddingProcessor();

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
    const processor = createEmbeddingProcessor();

    await expect(processor({ data: undefined } as never)).resolves.toEqual({
      success: false,
      error: 'Missing embedding payload',
    });
  });
});
