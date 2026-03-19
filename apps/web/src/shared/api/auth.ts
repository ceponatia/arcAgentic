import { http } from './http.js';
import type { AuthLoginResponse, AuthMeResponse } from '../auth/types.js';
import type { RuntimeConfigResponse } from '../../types.js';

export async function authLogin(params: {
  identifier: string;
  password: string;
}): Promise<AuthLoginResponse> {
  return http<AuthLoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    timeoutMs: 15000,
  });
}

export async function authMe(signal?: AbortSignal): Promise<AuthMeResponse> {
  return http<AuthMeResponse>('/auth/me', signal ? { signal } : undefined);
}

export async function getRuntimeConfig(signal?: AbortSignal): Promise<RuntimeConfigResponse> {
  return http<RuntimeConfigResponse>('/config', signal ? { signal } : undefined);
}
