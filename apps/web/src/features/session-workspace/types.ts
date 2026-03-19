import type {
  CharacterProfile,
  SettingProfile,
  PersonaProfile,
  TagTargetType,
  WorkspaceValidationResult as SharedWorkspaceValidationResult,
} from '@arcagentic/schemas';

export type WorkspaceStep =
  | 'setting'
  | 'locations'
  | 'npcs'
  | 'player'
  | 'tags'
  | 'relationships'
  | 'review';

export interface SettingWorkspaceState {
  settingId: string | null;
  settingProfile: SettingProfile | null;
  startTime?: {
    year?: number;
    month?: number;
    day?: number;
    hour: number;
    minute: number;
  } | undefined;
  secondsPerTurn?: number | undefined;
}

export interface LocationMapState {
  mapId: string | null;
  mapName?: string;
  startLocationId: string | null;
}

export type NpcRole = 'primary' | 'supporting' | 'background' | 'antagonist';
export type SessionNpcTier = 'major' | 'minor' | 'transient';

export interface NpcSessionConfig {
  characterId: string;
  characterProfile?: CharacterProfile;
  role: NpcRole;
  tier: SessionNpcTier;
  startLocationId?: string;
  label?: string;
}

export interface PlayerSessionConfig {
  personaId: string | null;
  personaProfile?: PersonaProfile;
  startLocationId?: string;
}

export interface TagSelection {
  tagId: string;
  tagName?: string;
  targetType: TagTargetType;
  /** Optional: specific entity IDs when targetType requires explicit targets (e.g., character, location) */
  targetEntityIds?: string[];
}

export interface RelationshipConfig {
  fromActorId: string;
  toActorId: string;
  relationshipType: string;
  affinitySeed?: {
    trust?: number;
    fondness?: number;
    fear?: number;
  };
}

export interface StepValidationState {
  valid: boolean;
  errors: string[];
}

export type WorkspaceValidationSummary = SharedWorkspaceValidationResult<
  WorkspaceStep,
  StepValidationState
>;

export interface WorkspaceState {
  // Navigation
  currentStep: WorkspaceStep;
  completedSteps: Set<WorkspaceStep>;

  // Step Data
  setting: SettingWorkspaceState;
  locations: LocationMapState;
  npcs: NpcSessionConfig[];
  player: PlayerSessionConfig;
  tags: TagSelection[];
  relationships: RelationshipConfig[];

  // Persistence
  draftId: string | null;
  isDirty: boolean;
  lastSavedAt: number | null;
  isSaving: boolean;

  // UI mode
  mode: 'wizard' | 'compact';
}

export interface WorkspaceActions {
  // Navigation
  setStep: (step: WorkspaceStep) => void;
  markStepComplete: (step: WorkspaceStep) => void;

  // Setting
  updateSetting: (partial: Partial<SettingWorkspaceState>) => void;
  selectSetting: (settingId: string, profile: SettingProfile) => void;
  clearSetting: () => void;

  // Locations
  updateLocations: (partial: Partial<LocationMapState>) => void;
  setLocations: (locations: LocationMapState | null) => void;

  // NPCs
  addNpc: (npc: NpcSessionConfig) => void;
  updateNpc: (characterId: string, partial: Partial<NpcSessionConfig>) => void;
  removeNpc: (characterId: string) => void;
  clearNpcs: () => void;

  // Player
  updatePlayer: (partial: Partial<PlayerSessionConfig>) => void;
  selectPersona: (personaId: string, profile: PersonaProfile) => void;
  clearPersona: () => void;

  // Tags
  addTag: (tag: TagSelection) => void;
  updateTag: (tagId: string, partial: Partial<TagSelection>) => void;
  removeTag: (tagId: string) => void;
  clearTags: () => void;

  // Relationships
  addRelationship: (rel: RelationshipConfig) => void;
  updateRelationship: (
    fromActorId: string,
    toActorId: string,
    partial: Partial<RelationshipConfig>
  ) => void;
  removeRelationship: (fromActorId: string, toActorId: string) => void;

  // Persistence
  setDraftId: (id: string | null) => void;
  markDirty: () => void;
  markSaved: () => void;
  setIsSaving: (saving: boolean) => void;
  saveDraftToServer: () => Promise<void>;
  deleteDraftFromServer: () => Promise<void>;

  // Mode
  setMode: (mode: 'wizard' | 'compact') => void;

  // Validation
  validate: () => WorkspaceValidationSummary;
  validateStep: (step: WorkspaceStep) => StepValidationState;

  // Reset
  reset: () => void;
  loadFromDraft: (draft: Partial<WorkspaceState>) => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;
