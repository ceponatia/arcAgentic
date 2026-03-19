import React, { Suspense, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSettings } from "../../shared/hooks/useSettings.js";
import { useCharacters } from "../../shared/hooks/useCharacters.js";
import { usePersonas } from "../../shared/hooks/usePersonas.js";
import { useTags } from "../../shared/hooks/useTags.js";
import { createSessionFull } from "../../shared/api/sessions.js";
import { useSessionStore } from "../../shared/stores/session-store.js";
import type { CreateFullSessionRequest } from "../../shared/api/types.js";

const SessionWorkspace = React.lazy(async () => {
  const mod = await import("../../features/session-workspace/index.js");
  return { default: mod.SessionWorkspace };
});

export function SessionBuilderRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const settings = useSettings();
  const characters = useCharacters();
  const personas = usePersonas();
  const tags = useTags();

  const handleCreateSession = useCallback(
    async (config: CreateFullSessionRequest): Promise<string> => {
      const response = await createSessionFull(config);
      return response.id;
    },
    [],
  );

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      useSessionStore.getState().setSessionId(sessionId);
      void navigate({ to: "/sessions/$id/chat", params: { id: sessionId } });
    },
    [navigate],
  );

  return (
    <Suspense fallback={null}>
      <SessionWorkspace
        settings={settings.data ?? []}
        settingsLoading={settings.loading}
        characters={characters.data ?? []}
        charactersLoading={characters.loading}
        personas={personas.data ?? []}
        personasLoading={personas.loading}
        tags={tags.data ?? []}
        tagsLoading={tags.loading}
        onRefreshSettings={settings.retry}
        onRefreshCharacters={characters.retry}
        onRefreshPersonas={personas.retry}
        onRefreshTags={tags.retry}
        onNavigateToSettingBuilder={() =>
          void navigate({ to: "/settings/builder" })
        }
        onNavigateToCharacterBuilder={() =>
          void navigate({ to: "/characters/studio" })
        }
        onNavigateToPersonaBuilder={() =>
          void navigate({ to: "/personas/builder" })
        }
        onCreateSession={handleCreateSession}
        onSessionCreated={handleSessionCreated}
      />
    </Suspense>
  );
}
