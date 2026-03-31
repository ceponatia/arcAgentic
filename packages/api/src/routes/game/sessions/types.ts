export interface SpokePayload {
  content?: string;
  entityProfileId?: string;
  action?: string;
  physicalAction?: string;
  observation?: string;
  internalState?: string;
  sensoryDetail?: string;
  emotion?: string;
}

export interface NarratorMessageRecordLike {
  turnSequence: unknown;
  prose: string;
  createdAt?: unknown;
  contributingActorIds?: unknown;
  spokeEventIds?: unknown;
}

export interface SessionMessageDto {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  idx: number;
  speaker?: {
    id: string;
    name: string;
  };
}
