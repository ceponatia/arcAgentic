import { http } from './http.js';
import type { EntityUsageSummary } from '@arcagentic/schemas';

export type { EntityUsageSummary };

export async function getCharacterUsage(
  characterId: string,
  signal?: AbortSignal
): Promise<EntityUsageSummary> {
  return http<EntityUsageSummary>(
    `/entity-usage/characters/${encodeURIComponent(characterId)}`,
    signal ? { signal } : undefined
  );
}

export async function getSettingUsage(
  settingId: string,
  signal?: AbortSignal
): Promise<EntityUsageSummary> {
  return http<EntityUsageSummary>(
    `/entity-usage/settings/${encodeURIComponent(settingId)}`,
    signal ? { signal } : undefined
  );
}

export async function getPersonaUsage(
  personaId: string,
  signal?: AbortSignal
): Promise<EntityUsageSummary> {
  return http<EntityUsageSummary>(
    `/entity-usage/personas/${encodeURIComponent(personaId)}`,
    signal ? { signal } : undefined
  );
}
