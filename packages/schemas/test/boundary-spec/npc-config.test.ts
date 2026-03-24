import {
  DEFAULT_NPC_RESPONSE_CONFIG,
  NpcResponseConfigSchema,
} from '@arcagentic/schemas';

describe('NpcResponseConfigSchema', () => {
  it('parses the default config successfully', () => {
    expect(NpcResponseConfigSchema.parse({})).toEqual(DEFAULT_NPC_RESPONSE_CONFIG);
  });

  it('matches the expected default config constants', () => {
    expect(DEFAULT_NPC_RESPONSE_CONFIG).toEqual({
      minSentencesPerAction: 2,
      maxSentencesPerAction: 3,
      minSensoryDetailsPerAction: 1,
      enforceTemporalOrdering: true,
      showPendingActions: true,
    });
  });

  it('requires minSentencesPerAction to be greater than 0', () => {
    expect(
      NpcResponseConfigSchema.safeParse({
        minSentencesPerAction: 1,
      }).success
    ).toBe(true);

    expect(
      NpcResponseConfigSchema.safeParse({
        minSentencesPerAction: 0,
      }).success
    ).toBe(false);
  });

  it('requires maxSentencesPerAction to be greater than 0', () => {
    expect(
      NpcResponseConfigSchema.safeParse({
        maxSentencesPerAction: 1,
      }).success
    ).toBe(true);

    expect(
      NpcResponseConfigSchema.safeParse({
        maxSentencesPerAction: 0,
      }).success
    ).toBe(false);
  });

  it('requires minSensoryDetailsPerAction to be non-negative', () => {
    expect(
      NpcResponseConfigSchema.safeParse({
        minSensoryDetailsPerAction: 0,
      }).success
    ).toBe(true);

    expect(
      NpcResponseConfigSchema.safeParse({
        minSensoryDetailsPerAction: -1,
      }).success
    ).toBe(false);
  });

  it('applies boolean defaults for enforce and show flags', () => {
    const result = NpcResponseConfigSchema.parse({});

    expect(result.enforceTemporalOrdering).toBe(true);
    expect(result.showPendingActions).toBe(true);
  });
});
