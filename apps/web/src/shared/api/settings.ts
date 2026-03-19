import { http } from './http.js';
import { SettingProfileSchema } from '@arcagentic/schemas';
import type { SettingSummary } from '../../types.js';
import type { SettingProfile } from '@arcagentic/schemas';

export interface SettingsListResponse {
  ok: boolean;
  settings?: SettingSummary[];
  total?: number;
  error?: string;
}

export interface SettingResponse {
  ok: boolean;
  setting?: SettingProfile;
  error?: string;
}

export async function getSettings(signal?: AbortSignal): Promise<SettingSummary[]> {
  const response = await http<SettingsListResponse>('/settings', signal ? { signal } : undefined);
  return response.settings ?? [];
}

export async function getSetting(settingId: string, signal?: AbortSignal): Promise<SettingProfile> {
  const response = await http<SettingResponse>(
    `/settings/${encodeURIComponent(settingId)}`,
    signal ? { signal } : undefined
  );
  if (!response.setting) {
    throw new Error(response.error ?? 'Setting not found');
  }

  const parsed = SettingProfileSchema.safeParse(response.setting);
  if (!parsed.success) {
    throw new Error('Invalid setting profile response');
  }

  return parsed.data;
}

export async function saveSetting(
  profile: SettingProfile,
  signal?: AbortSignal
): Promise<{ setting: SettingSummary }> {
  return http<{ setting: SettingSummary }>('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    ...(signal && { signal }),
  });
}

export async function deleteSetting(settingId: string, signal?: AbortSignal): Promise<void> {
  await http<void>(`/settings/${encodeURIComponent(settingId)}`, {
    method: 'DELETE',
    ...(signal && { signal }),
  });
}
