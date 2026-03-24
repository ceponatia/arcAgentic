import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOpenRouterEnvSettings } from '../src/config.js';

describe('getOpenRouterEnvSettings', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads env vars and config defaults correctly', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'router-key');
    vi.stubEnv('OPENROUTER_MODEL', 'openrouter/model');
    vi.stubEnv('OPENROUTER_BASE_URL', 'https://openrouter.example.test/v1');
    vi.stubEnv('OPENROUTER_PROVIDER_SORT', 'throughput');

    expect(
      getOpenRouterEnvSettings({
        id: 'openrouter-custom',
        defaultModel: 'fallback-model',
      })
    ).toEqual({
      apiKey: 'router-key',
      baseURL: 'https://openrouter.example.test/v1',
      id: 'openrouter-custom',
      model: 'openrouter/model',
      providerSort: 'throughput',
    });
  });

  it('returns null when the API key is missing', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');

    expect(getOpenRouterEnvSettings()).toBeNull();
  });

  it('parses provider sort and falls back to the default model', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'router-key');
    vi.stubEnv('OPENROUTER_PROVIDER_SORT', 'price');

    expect(
      getOpenRouterEnvSettings({
        defaultModel: 'fallback-model',
      })
    ).toEqual({
      apiKey: 'router-key',
      baseURL: 'https://openrouter.ai/api/v1',
      id: 'openrouter',
      model: 'fallback-model',
      providerSort: 'price',
    });
  });
});
