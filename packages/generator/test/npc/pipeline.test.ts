import { CharacterProfileSchema, NpcGenerationRequestSchema } from '@arcagentic/schemas';
import type { NpcGenerationRequest } from '@arcagentic/schemas';
import { generateNpc } from '../../src/npc/pipeline.js';
import { poolOnlyStrategy } from '../../src/npc/strategies/pool-only.js';

const BASE_CONTEXT = {
  location: {
    name: 'Market Square',
    description: 'A busy marketplace',
    type: 'urban',
    tags: ['commercial', 'public'],
  },
};

describe('NpcGenerationRequestSchema', () => {
  it('parses a valid transient request', () => {
    const input = { tier: 'transient', context: BASE_CONTEXT };

    expect(() => NpcGenerationRequestSchema.parse(input)).not.toThrow();
  });

  it('rejects an invalid tier', () => {
    const input = { tier: 'legendary', context: BASE_CONTEXT };

    expect(() => NpcGenerationRequestSchema.parse(input)).toThrow();
  });

  it('defaults allowFallback to true', () => {
    const parsed = NpcGenerationRequestSchema.parse({ tier: 'transient', context: BASE_CONTEXT });

    expect(parsed.allowFallback).toBe(true);
  });
});

describe('generateNpc pipeline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes transient tier to pool-only strategy', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const request: NpcGenerationRequest = {
      tier: 'transient',
      context: BASE_CONTEXT,
    };

    const result = await generateNpc(request);

    expect(result.meta.strategy).toBe('pool-only');
    expect(result.meta.requestedTier).toBe('transient');
    expect(result.meta.resolvedTier).toBe('transient');
    expect(result.meta.usedFallback).toBe(false);
  });

  it('falls back to pool-only for unsupported tiers', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const request: NpcGenerationRequest = {
      tier: 'background',
      context: BASE_CONTEXT,
    };

    const result = await generateNpc(request);

    expect(result.meta.requestedTier).toBe('background');
    expect(result.meta.resolvedTier).toBe('transient');
    expect(result.meta.strategy).toBe('pool-only');
    expect(result.meta.usedFallback).toBe(true);
  });

  it('throws when fallback is disabled and tier is unsupported', async () => {
    const request: NpcGenerationRequest = {
      tier: 'major',
      context: BASE_CONTEXT,
      allowFallback: false,
    };

    await expect(generateNpc(request)).rejects.toThrow(/No generation strategy/);
  });

  it('returns a profile that validates against CharacterProfileSchema', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await generateNpc({
      tier: 'transient',
      context: BASE_CONTEXT,
    });

    expect(() => CharacterProfileSchema.parse(result.profile)).not.toThrow();
  });

  it('sets tier to transient on the generated profile', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await generateNpc({
      tier: 'transient',
      context: BASE_CONTEXT,
    });

    expect(result.profile).toHaveProperty('tier', 'transient');
  });

  it('includes generated and transient tags', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await generateNpc({
      tier: 'transient',
      context: BASE_CONTEXT,
    });

    expect(result.profile).toHaveProperty('tags');
    const tags = (result.profile as { tags?: string[] }).tags ?? [];
    expect(tags).toContain('generated');
    expect(tags).toContain('transient');
  });

  it('applies nameOverride from context', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await generateNpc({
      tier: 'transient',
      context: {
        ...BASE_CONTEXT,
        nameOverride: 'Custom Name',
      },
    });

    expect(result.profile).toHaveProperty('name', 'Custom Name');
  });

  it('applies seed data to the generated profile', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await generateNpc({
      tier: 'transient',
      context: BASE_CONTEXT,
      seed: { age: 42, race: 'Elf' },
    });

    expect(result.profile).toHaveProperty('age', 42);
    expect(result.profile).toHaveProperty('race', 'Elf');
  });

  it('includes a valid generatedAt ISO timestamp in meta', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await generateNpc({
      tier: 'transient',
      context: BASE_CONTEXT,
    });

    expect(result.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('poolOnlyStrategy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('produces a valid character profile', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await poolOnlyStrategy({
      tier: 'transient',
      context: BASE_CONTEXT,
    });

    expect(() => CharacterProfileSchema.parse(result.profile)).not.toThrow();
  });

  it('always reports pool-only strategy in meta', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await poolOnlyStrategy({
      tier: 'transient',
      context: BASE_CONTEXT,
    });

    expect(result.meta.strategy).toBe('pool-only');
  });
});