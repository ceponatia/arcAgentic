import type { PresenceRecord, PresenceScheduler } from '@arcagentic/schemas';

export type PresenceStatus = 'running' | 'resumed';

export type { PresenceRecord, PresenceScheduler };

export interface PresenceServiceConfig {
  scheduler?: PresenceScheduler;
  now?: () => Date;
  pauseThresholdMs?: number;
}

export interface RecordHeartbeatResult {
  sessionId: string;
  status: PresenceStatus;
  lastHeartbeatAt: Date;
}
