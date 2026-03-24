import {
  CharacterProfileSchema,
  type CharacterProfile,
} from '@arcagentic/schemas';

const DEFAULT_CHARACTER_PROFILE: CharacterProfile = CharacterProfileSchema.parse({
  id: 'char-test-001',
  name: 'Test Character',
  age: 25,
  gender: 'female',
  summary: 'A test character for unit tests',
  backstory: 'Created for testing purposes.',
  tags: ['test'],
  race: 'Human',
  tier: 'major',
  personality: ['curious', 'brave'],
});

export function buildCharacterProfile(
  overrides: Partial<CharacterProfile> = {}
): CharacterProfile {
  return CharacterProfileSchema.parse({
    ...DEFAULT_CHARACTER_PROFILE,
    ...overrides,
  });
}
