import { CharacterProfileSchema } from '@arcagentic/schemas';
import type {
  BatchGenerationRequest,
  CharacterProfile,
  NpcGenerationContext,
  NpcGenerationResult,
  NpcTier,
} from '@arcagentic/schemas';
import { buildCharacterProfile } from '../../../../config/vitest/builders/character-profile.js';

const generateNpcMock = vi.fn();

vi.mock('../../src/npc/pipeline.js', () => ({
  generateNpc: generateNpcMock,
}));

import { generateNpcBatch } from '../../src/npc/batch.js';

const BASE_CONTEXT: NpcGenerationContext = {
  location: {
    name: 'Harbor Market',
    description: 'A cramped waterfront market full of shouting vendors.',
    type: 'urban',
    tags: ['market', 'dockside'],
  },
  setting: {
    era: 'Late medieval',
    tone: 'grounded adventure',
    themes: ['trade', 'secrets'],
  },
};

function buildResult(
  requestedTier: NpcTier,
  overrides: Partial<CharacterProfile> = {},
  usedFallback = false,
): NpcGenerationResult {
  const profile = CharacterProfileSchema.parse(
    buildCharacterProfile({
      tier: requestedTier,
      name: `${requestedTier}-npc`,
      occupation: `${requestedTier} worker`,
      ...overrides,
    }),
  );

  return {
    profile,
    meta: {
      requestedTier,
      resolvedTier: requestedTier,
      strategy: requestedTier === 'transient' ? 'pool-only' : 'llm-author',
      usedFallback,
      generatedAt: '2026-03-29T00:00:00.000Z',
    },
  };
}

describe('generateNpcBatch', () => {
  beforeEach(() => {
    generateNpcMock.mockReset();
  });

  it('generates tiers in order and threads existing NPC context forward', async () => {
    generateNpcMock
      .mockResolvedValueOnce(
        buildResult('transient', { name: 'Sera', race: 'Human', gender: 'female' }),
      )
      .mockResolvedValueOnce(
        buildResult('background', { name: 'Tovin', race: 'Elf', gender: 'male' }),
      )
      .mockResolvedValueOnce(
        buildResult('minor', { name: 'Ilex', race: 'Dwarf', gender: 'female' }, true),
      );

    const request: BatchGenerationRequest = {
      counts: {
        transient: 1,
        background: 1,
        minor: 1,
      },
      context: BASE_CONTEXT,
      allowFallback: true,
    };

    const result = await generateNpcBatch(request);

    expect(generateNpcMock).toHaveBeenCalledTimes(3);
    expect(generateNpcMock.mock.calls[0]?.[0]).toMatchObject({
      tier: 'transient',
      context: expect.objectContaining({ existingNpcs: undefined }),
    });
    expect(generateNpcMock.mock.calls[1]?.[0]).toMatchObject({
      tier: 'background',
      context: expect.objectContaining({
        existingNpcs: [expect.objectContaining({ name: 'Sera', tier: 'transient' })],
      }),
    });
    expect(generateNpcMock.mock.calls[2]?.[0]).toMatchObject({
      tier: 'minor',
      context: expect.objectContaining({
        existingNpcs: [
          expect.objectContaining({ name: 'Sera', tier: 'transient' }),
          expect.objectContaining({ name: 'Tovin', tier: 'background' }),
        ],
      }),
    });
    expect(result.meta.requested).toEqual({
      transient: 1,
      background: 1,
      minor: 1,
      major: 0,
    });
    expect(result.meta.generated).toEqual({
      transient: 1,
      background: 1,
      minor: 1,
      major: 0,
    });
    expect(result.meta.llmFallbacks).toBe(1);
  });

  it('retries duplicate names when uniqueNames is requested', async () => {
    generateNpcMock
      .mockResolvedValueOnce(
        buildResult('transient', { name: 'Mira', race: 'Human', gender: 'female' }),
      )
      .mockResolvedValueOnce(
        buildResult('transient', { name: 'Mira', race: 'Elf', gender: 'female' }),
      )
      .mockResolvedValueOnce(
        buildResult('transient', { name: 'Nessa', race: 'Elf', gender: 'female' }),
      );

    const result = await generateNpcBatch({
      counts: { transient: 2 },
      context: BASE_CONTEXT,
      diversity: { uniqueNames: true },
      allowFallback: true,
    });

    expect(generateNpcMock).toHaveBeenCalledTimes(3);
    expect(generateNpcMock.mock.calls[2]?.[0]).toMatchObject({
      tier: 'transient',
      context: expect.objectContaining({
        archetype: expect.stringContaining('distinct name'),
      }),
    });
    expect(result.npcs.map((npc) => (npc as CharacterProfile).name)).toEqual(['Mira', 'Nessa']);
  });
});
