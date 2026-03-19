import { http } from './http.js';
import type { UserPreferences, WorkspaceMode } from '@arcagentic/schemas';

export type { UserPreferences, WorkspaceMode };

export async function getUserPreferences(userId = 'default'): Promise<UserPreferences> {
  const result = await http<{ ok: true; preferences: UserPreferences }>(
    `/user/preferences?user_id=${encodeURIComponent(userId)}`
  );
  return result.preferences;
}

export async function updateUserPreferences(
  preferences: Partial<UserPreferences>,
  userId = 'default'
): Promise<UserPreferences> {
  const result = await http<{ ok: true; preferences: UserPreferences }>(
    `/user/preferences?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    }
  );
  return result.preferences;
}

export async function getWorkspaceModePreference(userId = 'default'): Promise<WorkspaceMode> {
  const result = await http<{ ok: true; mode: WorkspaceMode }>(
    `/user/preferences/workspace-mode?user_id=${encodeURIComponent(userId)}`
  );
  return result.mode;
}

export async function setWorkspaceModePreference(
  mode: WorkspaceMode,
  userId = 'default'
): Promise<void> {
  await http<{ ok: true; mode: WorkspaceMode }>(
    `/user/preferences/workspace-mode?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }
  );
}
