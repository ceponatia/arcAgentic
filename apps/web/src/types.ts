import type {
  Build,
  CharacterSummary,
  SettingSummary,
  TagTargetType,
  UserAssistantMessageRole,
  Speaker,
  ApiError,
  JsonPatchOperation,
} from '@arcagentic/schemas';
import type { UseFetchOnceResult } from './shared/hooks/useFetchOnce.js';

export type { Speaker };
export type {
  CharacterSummary,
  SettingSummary,
  PersonaSummary,
  ItemSummary,
  RuntimeConfigResponse,
} from '@arcagentic/schemas';

/** @deprecated Use ApiError from @arcagentic/schemas */
export type ApiErrorShape = ApiError;


export interface Message {
  role: UserAssistantMessageRole;
  content: string;
  createdAt: string; // ISO timestamp
  idx?: number; // Legacy/Display index OR Sequence for back-compat
  sequence?: number; // World Bus event sequence
  turnMetadata?: TurnMetadata;
  speaker?: Speaker;
}

export interface Session {
  id: string;
  name?: string | null;
  playerCharacterId: string;
  settingId: string;
  worldId?: string | null;
  status: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  messages: Message[];
}


export type UiIntentType =
  | 'move'
  | 'look'
  | 'talk'
  | 'use'
  | 'take'
  | 'give'
  | 'examine'
  | 'wait'
  | 'system'
  | 'unknown';

export interface IntentParams {
  target?: string;
  direction?: string;
  item?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

export interface IntentSegment {
  type: 'talk' | 'action' | 'thought' | 'emote' | 'sensory';
  content: string;
  sensoryType?: 'smell' | 'touch' | 'look' | 'taste' | 'listen';
  bodyPart?: string;
}

export interface DetectedIntent {
  type: UiIntentType;
  confidence: number;
  params?: IntentParams;
  signals?: string[];
  segments?: IntentSegment[];
}

export interface IntentDetectionPromptSnapshot {
  system: string;
  user: string;
}

export interface IntentDetectionDebug {
  detector: string;
  model?: string;
  prompt?: IntentDetectionPromptSnapshot;
  historyPreview?: string[];
  contextSummary?: string[];
  rawResponse?: string;
  parsed?: unknown;
  warnings?: string[];
}

export type AgentType = 'map' | 'npc' | 'rules' | 'parser' | 'sensory' | 'custom';

export interface AgentEvent {
  type: string;
  payload: Record<string, unknown>;
  source: AgentType;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface AgentDiagnostics {
  executionTimeMs?: number;
  tokenUsage?: TokenUsage;
  warnings?: string[];
  debug?: Record<string, unknown>;
}

export interface AgentOutput {
  narrative: string;
  statePatches?: JsonPatchOperation[];
  events?: AgentEvent[];
  diagnostics?: AgentDiagnostics;
  continueProcessing?: boolean;
}

export interface AgentOutputWithType {
  agentType: AgentType;
  output: AgentOutput;
}

export interface PhaseTiming {
  intentDetectionMs?: number;
  stateRecallMs?: number;
  contextRetrievalMs?: number;
  agentRoutingMs?: number;
  agentExecutionMs?: number;
  stateUpdateMs?: number;
  responseAggregationMs?: number;
}

export interface TurnMetadata {
  processingTimeMs: number;
  intent?: DetectedIntent;
  intentDebug?: IntentDetectionDebug;
  agentsInvoked: AgentType[];
  agentOutputs?: AgentOutputWithType[];
  nodesRetrieved?: number;
  phaseTiming?: PhaseTiming;
}

export interface NpcInstanceSummary {
  id: string;
  role: string;
  label: string | null;
  templateId: string;
  name?: string;
  createdAt?: string;
}

export type TurnDebugSliceVariant = 'intent' | 'prompt' | 'raw' | 'agent';

export type TurnDebugSliceBody =
  | { kind: 'text'; lines: string[] }
  | { kind: 'list'; title?: string; items: string[] }
  | { kind: 'code'; label?: string; value: string }
  | { kind: 'json'; label?: string; value: string };

export interface TurnDebugSlice {
  id: string;
  title: string;
  variant: TurnDebugSliceVariant;
  description?: string;
  body: TurnDebugSliceBody;
}

export interface SessionSummary {
  id: string;
  name?: string | null;
  playerCharacterId: string | null;
  settingId: string | null;
  characterName: string;
  settingName: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CharactersState {
  loading: boolean;
  error: string | null;
  data: CharacterSummary[] | null;
}

export type UseCharactersResult = UseFetchOnceResult<CharacterSummary[]>;

export interface SettingsState {
  loading: boolean;
  error: string | null;
  data: SettingSummary[] | null;
}

export type UseSettingsResult = UseFetchOnceResult<SettingSummary[]>;

export interface TagSummary {
  id: string;
  name: string;
  shortDescription: string | null;
  promptText: string;
  targetType: TagTargetType;
}

export interface TagsState {
  loading: boolean;
  error: string | null;
  data: TagSummary[] | null;
}

export type UseTagsResult = UseFetchOnceResult<TagSummary[]>;

export interface SessionsState {
  loading: boolean;
  error: string | null;
  data: SessionSummary[] | null;
}

export interface UseSessionsResult extends SessionsState {
  refresh: () => void;
}

export type SelectOption<T extends string> = '' | T;

export type HeightOption = SelectOption<Build['height']>;
export type TorsoBuildOption = SelectOption<Build['torso']>;
export type ArmsBuildOption = SelectOption<Build['arms']['build']>;
export type ArmsLengthOption = SelectOption<Build['arms']['length']>;
export type LegsLengthOption = SelectOption<Build['legs']['length']>;
export type LegsBuildOption = SelectOption<Build['legs']['build']>;

// Mobile UI Types
export interface MobileHeaderProps {
  onMenuToggle: () => void;
  characterName?: string | null;
  settingName?: string | null;
  hasSession: boolean;
}

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // Character panel
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  onEditCharacter: (id: string) => void;
  characters: CharacterSummary[];
  charactersLoading: boolean;
  charactersError: string | null;
  onRefreshCharacters: () => void;
  // Settings panel
  selectedSettingId: string | null;
  onSelectSetting: (id: string | null) => void;
  onEditSetting: (id: string) => void;
  settings: SettingSummary[];
  settingsLoading: boolean;
  settingsError: string | null;
  onRefreshSettings: () => void;
  // Tags panel
  selectedTagIds: string[];
  onToggleTag: (id: string) => void;
  onEditTags: () => void;
  // Session controls
  canStartSession: boolean;
  onStartSession: () => void;
  creating: boolean;
  createError: string | null;
  // Sessions panel
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  onRefreshSessions: () => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

// Phase 7: Frontend Reactivity Types

export type StreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface StreamEvent {
  readonly type: string;
  readonly timestamp?: string | number | Date;
  readonly [key: string]: unknown;
}

export interface ActorDebugState {
  readonly locationId?: string | undefined;
  readonly hpPercent?: number | undefined;
}
