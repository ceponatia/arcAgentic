import { CreateFullSessionRequestSchema } from '@arcagentic/schemas';

describe('CreateFullSessionRequestSchema', () => {
  it('accepts a valid minimal request with a settingId and at least one NPC', () => {
    const result = CreateFullSessionRequestSchema.parse({
      settingId: 'setting-001',
      npcs: [{ characterId: 'char-001' }],
    });

    expect(result.settingId).toBe('setting-001');
    expect(result.npcs).toHaveLength(1);
    expect(result.npcs[0]).toMatchObject({
      characterId: 'char-001',
      role: 'supporting',
      tier: 'minor',
    });
  });

  it('rejects an empty NPC array', () => {
    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [],
      }).success
    ).toBe(false);
  });

  it('rejects missing settingId', () => {
    expect(
      CreateFullSessionRequestSchema.safeParse({
        npcs: [{ characterId: 'char-001' }],
      }).success
    ).toBe(false);
  });

  it('requires characterId on each NPC entry', () => {
    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{}],
      }).success
    ).toBe(false);
  });

  it('validates optional startTime hour and minute bounds', () => {
    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        startTime: { hour: 0, minute: 59 },
      }).success
    ).toBe(true);

    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        startTime: { hour: 24, minute: 0 },
      }).success
    ).toBe(false);

    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        startTime: { hour: 12, minute: 60 },
      }).success
    ).toBe(false);
  });

  it('validates optional relationships', () => {
    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        relationships: [
          {
            fromActorId: 'actor-001',
            toActorId: 'actor-002',
            relationshipType: 'ally',
            affinitySeed: {
              trust: 0.7,
              fondness: 0.8,
              fear: 0.1,
            },
          },
        ],
      }).success
    ).toBe(true);

    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        relationships: [
          {
            toActorId: 'actor-002',
          },
        ],
      }).success
    ).toBe(false);
  });

  it('accepts both legacy and v2 session tag formats', () => {
    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        tags: [
          {
            tagId: 'tag-001',
            scope: 'session',
          },
        ],
      }).success
    ).toBe(true);

    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        tags: [
          {
            tagId: 'tag-001',
            targetType: 'session',
            targetEntityId: null,
          },
        ],
      }).success
    ).toBe(true);
  });

  it('requires secondsPerTurn to be at least 1', () => {
    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        secondsPerTurn: 1,
      }).success
    ).toBe(true);

    expect(
      CreateFullSessionRequestSchema.safeParse({
        settingId: 'setting-001',
        npcs: [{ characterId: 'char-001' }],
        secondsPerTurn: 0,
      }).success
    ).toBe(false);
  });
});
