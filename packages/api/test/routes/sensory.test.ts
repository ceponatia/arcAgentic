import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTestApp,
  getRequest,
} from '../../../../config/vitest/hono/create-test-client.js';

const sensoryModule = vi.hoisted(() => ({
  getLiveSensoryTemplates: vi.fn(),
}));

vi.mock('../../src/services/sensoryTemplates.js', () => ({
  getLiveSensoryTemplates: sensoryModule.getLiveSensoryTemplates,
}));

import { registerSensoryRoutes } from '../../src/routes/sensory.js';

function createApp() {
  const app = createTestApp();
  registerSensoryRoutes(app);
  return app;
}

describe('sensory routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sensoryModule.getLiveSensoryTemplates.mockReturnValue([
      {
        id: 'feet-clean',
        name: 'Clean Feet',
        description: 'Freshly washed feet with a neutral scent.',
        tags: ['clean', 'baseline'],
        suggestedFor: ['daily'],
        affectedRegions: ['feet'],
        layers: ['topical'],
      },
    ]);
  });

  it('returns template summaries', async () => {
    const response = await createApp().request(getRequest('/api/sensory/templates'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      templates: [
        {
          id: 'feet-clean',
          name: 'Clean Feet',
          description: 'Freshly washed feet with a neutral scent.',
          tags: ['clean', 'baseline'],
          suggestedFor: ['daily'],
          affectedRegions: ['feet'],
        },
      ],
    });
  });

  it('returns full templates', async () => {
    const response = await createApp().request(getRequest('/api/sensory/templates/full'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      templates: [
        {
          id: 'feet-clean',
          name: 'Clean Feet',
          description: 'Freshly washed feet with a neutral scent.',
          tags: ['clean', 'baseline'],
          suggestedFor: ['daily'],
          affectedRegions: ['feet'],
          layers: ['topical'],
        },
      ],
    });
  });
});
