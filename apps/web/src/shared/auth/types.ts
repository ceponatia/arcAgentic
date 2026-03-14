import type { AuthUser } from '@arcagentic/schemas';

export type { AuthUser, UserRole } from '@arcagentic/schemas';

export interface AuthMeResponse {
  ok: true;
  user: AuthUser | null;
}

export interface AuthLoginResponse {
  ok: true;
  token: string;
  user: AuthUser;
}
