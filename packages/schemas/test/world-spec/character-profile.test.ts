import { CharacterProfileSchema } from '@arcagentic/schemas';
import { buildCharacterProfile } from '../../../../config/vitest/builders/character-profile.js';

describe('CharacterProfileSchema', () => {
  it('parses a valid minimal profile built from defaults', () => {
    const profile = buildCharacterProfile();

    expect(CharacterProfileSchema.parse(profile)).toEqual(profile);
  });

  it('accepts personality as a string or string array', () => {
    const stringPersonality = CharacterProfileSchema.safeParse(
      buildCharacterProfile({ personality: 'curious' })
    );
    const arrayPersonality = CharacterProfileSchema.safeParse(
      buildCharacterProfile({ personality: ['curious', 'brave'] })
    );

    expect(stringPersonality.success).toBe(true);
    expect(arrayPersonality.success).toBe(true);
  });

  it('requires personality to be non-empty', () => {
    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        personality: '',
      }).success
    ).toBe(false);

    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        personality: [],
      }).success
    ).toBe(false);
  });

  it('allows optional profile sections to be omitted', () => {
    const {
      physique: _physique,
      body: _body,
      hygiene: _hygiene,
      personalityMap: _personalityMap,
      details: _details,
      ...profile
    } = buildCharacterProfile();

    const result = CharacterProfileSchema.safeParse(profile);

    expect(result.success).toBe(true);
    expect(result.data?.physique).toBeUndefined();
    expect(result.data?.body).toBeUndefined();
    expect(result.data?.hygiene).toBeUndefined();
    expect(result.data?.personalityMap).toBeUndefined();
    expect(result.data?.details).toBeUndefined();
  });

  it('enforces the details array max length of 32 items', () => {
    const validDetails = Array.from({ length: 32 }, (_, index) => ({
      label: `detail-${index}`,
      value: `value-${index}`,
    }));
    const invalidDetails = Array.from({ length: 33 }, (_, index) => ({
      label: `detail-${index}`,
      value: `value-${index}`,
    }));

    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        details: validDetails,
      }).success
    ).toBe(true);

    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        details: invalidDetails,
      }).success
    ).toBe(false);
  });

  it('requires valid URLs for profilePic and emotePic when provided', () => {
    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        profilePic: 'https://example.com/profile.png',
        emotePic: 'https://example.com/emote.png',
      }).success
    ).toBe(true);

    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        profilePic: 'not-a-url',
      }).success
    ).toBe(false);

    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        emotePic: 'not-a-url',
      }).success
    ).toBe(false);
  });

  it('defaults tier to minor when omitted', () => {
    const { tier: _tier, ...profile } = buildCharacterProfile();

    const result = CharacterProfileSchema.parse(profile);

    expect(result.tier).toBe('minor');
  });

  it('requires race', () => {
    const { race: _race, ...profile } = buildCharacterProfile();

    expect(CharacterProfileSchema.safeParse(profile).success).toBe(false);
  });

  it('requires non-empty backstory', () => {
    const { backstory: _backstory, ...profileWithoutBackstory } = buildCharacterProfile();

    expect(CharacterProfileSchema.safeParse(profileWithoutBackstory).success).toBe(false);
    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        backstory: '',
      }).success
    ).toBe(false);
  });

  it('defaults tags to draft when omitted', () => {
    const { tags: _tags, ...profile } = buildCharacterProfile();

    const result = CharacterProfileSchema.parse(profile);

    expect(result.tags).toEqual(['draft']);
  });

  it('rejects invalid gender values', () => {
    expect(
      CharacterProfileSchema.safeParse({
        ...buildCharacterProfile(),
        gender: 'invalid-gender',
      }).success
    ).toBe(false);
  });

  it('round-trips through parse without changing the output', () => {
    const firstParse = CharacterProfileSchema.parse(buildCharacterProfile());
    const secondParse = CharacterProfileSchema.parse(firstParse);

    expect(secondParse).toEqual(firstParse);
  });
});
