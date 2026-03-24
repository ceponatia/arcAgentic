import { vi } from 'vitest';

export interface MockDb {
  createSession: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  listSessions: ReturnType<typeof vi.fn>;
  deleteSession: ReturnType<typeof vi.fn>;
  getSessionProjection: ReturnType<typeof vi.fn>;
  getSessionGameTime: ReturnType<typeof vi.fn>;
  updateSessionHeartbeat: ReturnType<typeof vi.fn>;
  getActiveSessions: ReturnType<typeof vi.fn>;
}

export function mockDb(): MockDb {
  return {
    createSession: vi.fn(),
    getSession: vi.fn(),
    listSessions: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    getSessionProjection: vi.fn(),
    getSessionGameTime: vi.fn(),
    updateSessionHeartbeat: vi.fn(),
    getActiveSessions: vi.fn().mockResolvedValue([]),
  };
}
