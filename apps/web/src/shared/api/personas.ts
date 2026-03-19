import { http } from './http.js';
import type { PersonaSummary } from '../../types.js';
import type { PersonaProfile } from '@arcagentic/schemas';

export async function getPersonas(signal?: AbortSignal): Promise<PersonaSummary[]> {
  const response = await http<{ ok: boolean; personas?: PersonaSummary[]; total?: number }>(
    '/personas',
    signal ? { signal } : undefined
  );
  return response.personas ?? [];
}

export async function getPersona(personaId: string, signal?: AbortSignal): Promise<PersonaProfile> {
  const response = await http<{ ok: boolean; persona?: PersonaProfile }>(
    `/personas/${encodeURIComponent(personaId)}`,
    signal ? { signal } : undefined
  );
  if (!response.persona) {
    throw new Error('Persona not found');
  }
  return response.persona;
}

export async function savePersona(
  profile: PersonaProfile,
  signal?: AbortSignal
): Promise<{ persona: PersonaSummary }> {
  return http<{ persona: PersonaSummary }>('/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    ...(signal && { signal }),
  });
}

export async function deletePersona(personaId: string, signal?: AbortSignal): Promise<void> {
  return http<void>(`/personas/${encodeURIComponent(personaId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}
