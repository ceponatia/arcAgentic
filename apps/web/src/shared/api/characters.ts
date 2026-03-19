import { http } from './http.js';
import type { CharacterSummary } from '../../types.js';
import type { CharacterProfile } from '@arcagentic/schemas';

interface CharactersListResponse {
  ok: boolean;
  characters?: CharacterSummary[];
  total?: number;
}

export async function getCharacters(signal?: AbortSignal): Promise<CharacterSummary[]> {
  const response = await http<CharactersListResponse>('/characters', signal ? { signal } : undefined);
  return response.characters ?? [];
}

export async function getCharacter(
  characterId: string,
  signal?: AbortSignal
): Promise<CharacterProfile> {
  const response = await http<{ ok: boolean; character?: CharacterProfile }>(
    `/characters/${encodeURIComponent(characterId)}`,
    signal ? { signal } : undefined
  );
  if (!response.character) {
    throw new Error('Character not found');
  }
  return response.character;
}

export async function saveCharacter(
  profile: CharacterProfile,
  signal?: AbortSignal
): Promise<{ character: CharacterSummary }> {
  return http<{ character: CharacterSummary }>('/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    ...(signal && { signal }),
  });
}

export async function deleteCharacter(characterId: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/characters/${encodeURIComponent(characterId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}
