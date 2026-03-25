import type { CharacterProfile, SettingProfile, PersonaProfile } from '@arcagentic/schemas';
import type {
  CharacterSummary,
  MapCharacterSummary,
  MapSettingSummary,
  PersonaSummary,
} from '../loaders/types.js';

export const mapCharacterSummary: MapCharacterSummary = (c: CharacterProfile, source) => {
  const dto: CharacterSummary = {
    id: c.id,
    name: c.name,
    summary: c.summary,
    source,
  };
  if (c.tags && c.tags.length > 0) dto.tags = c.tags;
  return dto;
};

export const mapSettingSummary: MapSettingSummary = (s: SettingProfile, source) => ({
  id: s.id,
  name: s.name,
  source,
});

export const mapPersonaSummary = (
  p: PersonaProfile,
  createdAt: Date,
  updatedAt: Date,
): PersonaSummary => ({
  id: p.id,
  name: p.name,
  summary: p.summary,
  age: p.age,
  gender: p.gender,
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
});
