const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@arcagentic/logger', () => ({
  createLogger: vi.fn(() => loggerMock),
}));

async function loadConfigModule(redisUrl?: string) {
  vi.resetModules();
  vi.unstubAllEnvs();

  if (redisUrl !== undefined) {
    vi.stubEnv('REDIS_URL', redisUrl);
  }

  return import('../src/config.js');
}

async function loadOpenAiWorkerConfig(env: {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
} = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();

  if ('apiKey' in env) {
    vi.stubEnv('OPENAI_API_KEY', env.apiKey ?? '');
  }

  if ('model' in env) {
    vi.stubEnv('OPENAI_MODEL', env.model ?? '');
  }

  if ('baseUrl' in env) {
    vi.stubEnv('OPENAI_BASE_URL', env.baseUrl ?? '');
  }

  const module = await import('../src/config.js');
  return module.getOpenAiWorkerConfig();
}

describe('workers config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('connection', () => {
    it('parses a basic redis URL into BullMQ connection options', async () => {
      const { connection } = await loadConfigModule('redis://localhost:6379');

      expect(connection).toEqual({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
      });
    });

    it('parses username and password from a redis URL', async () => {
      const { connection } = await loadConfigModule('redis://user:pass@cache.internal:1234');

      expect(connection).toEqual({
        host: 'cache.internal',
        port: 1234,
        username: 'user',
        password: 'pass',
        maxRetriesPerRequest: null,
      });
    });

    it('adds a tls object for rediss URLs', async () => {
      const { connection } = await loadConfigModule('rediss://secure-cache:6380');

      expect(connection).toEqual({
        host: 'secure-cache',
        port: 6380,
        tls: {},
        maxRetriesPerRequest: null,
      });
    });

    it('defaults the redis port to 6379 when none is specified', async () => {
      const { connection } = await loadConfigModule('redis://localhost');

      expect(connection).toEqual({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
      });
    });

    it('throws when REDIS_URL uses an unsupported protocol', async () => {
      await expect(loadConfigModule('http://localhost:6379')).rejects.toThrow(
        'Unsupported REDIS_URL protocol: http:'
      );
    });

    it('throws when REDIS_URL contains an invalid port', async () => {
      await expect(loadConfigModule('redis://localhost:invalid')).rejects.toThrow();
    });

    it('always sets maxRetriesPerRequest to null', async () => {
      const { connection } = await loadConfigModule('redis://localhost:6381');

      expect(connection.maxRetriesPerRequest).toBeNull();
    });
  });

  describe('getOpenAiWorkerConfig', () => {
    it('returns apiKey, model, and baseUrl when all env vars are present', async () => {
      const config = await loadOpenAiWorkerConfig({
        apiKey: 'test-key',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://example.test/v1',
      });

      expect(config).toEqual({
        apiKey: 'test-key',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://example.test/v1',
      });
    });

    it('throws when OPENAI_API_KEY is missing', async () => {
      await expect(loadOpenAiWorkerConfig({ apiKey: '' })).rejects.toThrow(
        'Missing OPENAI_API_KEY for workers LLM router'
      );
    });

    it('defaults the model when OPENAI_MODEL is not set', async () => {
      const config = await loadOpenAiWorkerConfig({ apiKey: 'test-key' });

      expect(config.model).toBe('gpt-4o-mini');
    });

    it('defaults the model when OPENAI_MODEL is an empty string', async () => {
      const config = await loadOpenAiWorkerConfig({
        apiKey: 'test-key',
        model: '',
      });

      expect(config.model).toBe('gpt-4o-mini');
    });

    it('includes baseUrl when OPENAI_BASE_URL is set', async () => {
      const config = await loadOpenAiWorkerConfig({
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v1',
      });

      expect(config.baseUrl).toBe('https://example.test/v1');
    });

    it('omits baseUrl when OPENAI_BASE_URL is unset or blank', async () => {
      const missingBaseUrlConfig = await loadOpenAiWorkerConfig({ apiKey: 'test-key' });
      const blankBaseUrlConfig = await loadOpenAiWorkerConfig({
        apiKey: 'test-key',
        baseUrl: '',
      });

      expect(missingBaseUrlConfig.baseUrl).toBeUndefined();
      expect(blankBaseUrlConfig.baseUrl).toBeUndefined();
    });
  });
});
