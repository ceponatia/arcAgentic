import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { getErrorMessage } from "@arcagentic/utils";
import { createSessionFull, deleteSession } from "../shared/api/client.js";
import type { CreateFullSessionRequest } from "../shared/api/types.js";
import { useSessions } from "../shared/hooks/useSessions.js";
import { useCharacters } from "../shared/hooks/useCharacters.js";
import { useSettings } from "../shared/hooks/useSettings.js";
import { usePersonas } from "../shared/hooks/usePersonas.js";
import { useTags } from "../shared/hooks/useTags.js";
import { useItems } from "../shared/hooks/useItems.js";
import { useRefreshOnViewEnter } from "../shared/hooks/useRefreshOnViewEnter.js";
import { useSessionStore } from "../shared/stores/session-store.js";
import type {
  ViewMode,
  SessionSummary,
  CharacterSummary,
  SettingSummary,
  PersonaSummary,
  TagSummary,
  ItemSummary,
} from "../types.js";

export interface LegacyDataContextValue {
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  refreshSessions: () => void;
  characters: CharacterSummary[];
  charactersLoading: boolean;
  charactersError: string | null;
  refreshCharacters: () => void;
  settings: SettingSummary[];
  settingsLoading: boolean;
  settingsError: string | null;
  refreshSettings: () => void;
  personas: PersonaSummary[];
  personasLoading: boolean;
  personasError: string | null;
  refreshPersonas: () => void;
  tags: TagSummary[];
  tagsLoading: boolean;
  tagsError: string | null;
  refreshTags: () => void;
  items: ItemSummary[];
  itemsLoading: boolean;
  itemsError: string | null;
  refreshItems: () => void;
  creating: boolean;
  createError: string | null;
  onCreateSessionFull: (config: CreateFullSessionRequest) => Promise<string>;
  handleDeleteSession: (sessionId: string) => Promise<void>;
}

const LegacyDataContext = createContext<LegacyDataContextValue | null>(null);

export function useLegacyData(): LegacyDataContextValue {
  const ctx = useContext(LegacyDataContext);
  if (!ctx)
    throw new Error("useLegacyData must be used within LegacyDataProvider");
  return ctx;
}

interface LegacyDataProviderProps {
  viewMode: ViewMode;
  children: React.ReactNode;
}

export function LegacyDataProvider({
  viewMode,
  children,
}: LegacyDataProviderProps): React.JSX.Element {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createAbortRef = useRef<AbortController | null>(null);

  const currentSessionId = useSessionStore((s) => s.currentSessionId);

  const {
    loading: sessionsLoading,
    error: sessionsError,
    data: sessionsData,
    refresh: refreshSessions,
  } = useSessions();

  const {
    loading: charactersLoading,
    error: charactersError,
    data: charactersData,
    retry: refreshCharacters,
  } = useCharacters();

  const {
    loading: settingsLoading,
    error: settingsError,
    data: settingsData,
    retry: refreshSettings,
  } = useSettings();

  const {
    loading: personasLoading,
    error: personasError,
    data: personasData,
    retry: refreshPersonas,
  } = usePersonas();

  const {
    loading: tagsLoading,
    error: tagsError,
    data: tagsData,
    retry: refreshTags,
  } = useTags();

  const {
    loading: itemsLoading,
    error: itemsError,
    data: itemsData,
    retry: refreshItems,
  } = useItems();

  useRefreshOnViewEnter<ViewMode>(viewMode, [
    {
      views: ["session-builder", "setting-library", "setting-builder"],
      refresh: refreshSettings,
    },
    {
      views: ["session-builder", "character-library", "character-studio"],
      refresh: refreshCharacters,
    },
  ]);

  const onCreateSessionFull = useCallback(
    async (config: CreateFullSessionRequest): Promise<string> => {
      setCreating(true);
      setCreateError(null);
      createAbortRef.current?.abort();
      const ctrl = new AbortController();
      createAbortRef.current = ctrl;
      try {
        const response = await createSessionFull(config, ctrl.signal);
        refreshSessions();
        return response.id;
      } catch (err) {
        const msg = getErrorMessage(err, "Failed to create session");
        setCreateError(msg);
        throw new Error(msg);
      } finally {
        setCreating(false);
      }
    },
    [refreshSessions],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!confirm("Are you sure you want to delete this session?")) return;
      try {
        await deleteSession(sessionId);
        if (currentSessionId === sessionId) {
          useSessionStore.getState().setSessionId(null);
        }
        refreshSessions();
      } catch (err) {
        console.error("Failed to delete session", err);
        alert("Failed to delete session");
      }
    },
    [currentSessionId, refreshSessions],
  );

  const value: LegacyDataContextValue = {
    sessions: sessionsData ?? [],
    sessionsLoading,
    sessionsError,
    refreshSessions,
    characters: charactersData ?? [],
    charactersLoading,
    charactersError,
    refreshCharacters,
    settings: settingsData ?? [],
    settingsLoading,
    settingsError,
    refreshSettings,
    personas: personasData ?? [],
    personasLoading,
    personasError,
    refreshPersonas,
    tags: tagsData ?? [],
    tagsLoading,
    tagsError,
    refreshTags,
    items: itemsData ?? [],
    itemsLoading,
    itemsError,
    refreshItems,
    creating,
    createError,
    onCreateSessionFull,
    handleDeleteSession,
  };

  return <LegacyDataContext value={value}>{children}</LegacyDataContext>;
}
