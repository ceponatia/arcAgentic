import React, { Suspense } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useLegacyData } from "./LegacyDataContext.js";
import { useSessionStore } from "../shared/stores/session-store.js";
import { DevNews } from "../features/dev-news/index.js";
import type { CharacterStudioProps } from "../features/character-studio/index.js";

// --- Lazy imports (copied from AppShell.tsx) ---

const ChatPanel = React.lazy(async () => {
  const mod = await import("../features/chat-panel/index.js");
  return { default: mod.ChatPanel };
});

const CharacterStudio = React.lazy(async () => {
  const mod = (await import("../features/character-studio/index.js")) as {
    CharacterStudio: React.ComponentType<CharacterStudioProps>;
  };
  return { default: mod.CharacterStudio };
});

const SettingBuilder = React.lazy(async () => {
  const mod = await import("../features/setting-builder/index.js");
  return { default: mod.SettingBuilder };
});

const ItemBuilder = React.lazy(async () => {
  const mod = await import("../features/item-builder/index.js");
  return { default: mod.ItemBuilder };
});

const TagBuilder = React.lazy(async () => {
  const mod = await import("../features/tag-builder/TagBuilder.js");
  return { default: mod.TagBuilder };
});

const SessionWorkspace = React.lazy(async () => {
  const mod = await import("../features/session-workspace/index.js");
  return { default: mod.SessionWorkspace };
});

const PersonaBuilder = React.lazy(async () => {
  const mod = await import("../features/persona-builder/PersonaBuilder.js");
  return { default: mod.PersonaBuilder };
});

const DocsViewer = React.lazy(async () => {
  const mod = await import("../features/docs/index.js");
  return { default: mod.DocsViewer };
});

const CharacterLibrary = React.lazy(async () => {
  const mod = await import("../features/library/index.js");
  return { default: mod.CharacterLibrary };
});

const SettingLibrary = React.lazy(async () => {
  const mod = await import("../features/library/index.js");
  return { default: mod.SettingLibrary };
});

const TagLibrary = React.lazy(async () => {
  const mod = await import("../features/library/index.js");
  return { default: mod.TagLibrary };
});

const SessionLibrary = React.lazy(async () => {
  const mod = await import("../features/library/index.js");
  return { default: mod.SessionLibrary };
});

const ItemLibrary = React.lazy(async () => {
  const mod = await import("../features/library/index.js");
  return { default: mod.ItemLibrary };
});

const PersonaLibrary = React.lazy(async () => {
  const mod = await import("../features/library/index.js");
  return { default: mod.PersonaLibrary };
});

const LocationView = React.lazy(async () => {
  const mod = await import("../features/locations/index.js");
  return { default: mod.LocationView };
});

// --- Route Components ---

export function HomeLegacy(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="max-w-5xl mx-auto py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        <div className="text-center lg:text-left pt-6 lg:pt-10">
          <h1 className="text-3xl font-semibold text-slate-100 mb-4">
            Welcome to ArcAgentic
          </h1>
          <p className="text-slate-400 mb-8">
            Create characters, build settings, and start immersive roleplay
            sessions.
          </p>
          <div className="flex flex-wrap justify-center lg:justify-start gap-3">
            <button
              onClick={() => void navigate({ to: "/characters/studio" })}
              className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              Create Character
            </button>
            <button
              onClick={() => void navigate({ to: "/settings/builder" })}
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Create Setting
            </button>
            <button
              onClick={() => void navigate({ to: "/items/builder" })}
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Create Item
            </button>
          </div>
          <div className="mt-6 text-xs text-slate-500">
            Alpha note: expect frequent updates and occasional breaking changes.
          </div>
        </div>
        <div className="lg:pt-6">
          <DevNews />
        </div>
      </div>
    </div>
  );
}

export function CharacterLibraryLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <CharacterLibrary
        characters={data.characters}
        loading={data.charactersLoading}
        error={data.charactersError}
        onRefresh={data.refreshCharacters}
        onEdit={(id) =>
          void navigate({ to: "/characters/studio/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/characters/studio" })}
      />
    </Suspense>
  );
}

export function CharacterStudioLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <CharacterStudio
        id={null}
        onSave={data.refreshCharacters}
        onCancel={() => void navigate({ to: "/characters" })}
      />
    </Suspense>
  );
}

export function CharacterStudioEditLegacy(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <CharacterStudio
        id={id ?? null}
        onSave={data.refreshCharacters}
        onCancel={() => void navigate({ to: "/characters" })}
      />
    </Suspense>
  );
}

export function SettingLibraryLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <SettingLibrary
        settings={data.settings}
        loading={data.settingsLoading}
        error={data.settingsError}
        onRefresh={data.refreshSettings}
        onEdit={(id) =>
          void navigate({ to: "/settings/builder/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/settings/builder" })}
      />
    </Suspense>
  );
}

export function SettingBuilderLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <SettingBuilder
        id={null}
        onSave={data.refreshSettings}
        onCancel={() => void navigate({ to: "/settings" })}
      />
    </Suspense>
  );
}

export function SettingBuilderEditLegacy(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <SettingBuilder
        id={id ?? null}
        onSave={data.refreshSettings}
        onCancel={() => void navigate({ to: "/settings" })}
      />
    </Suspense>
  );
}

export function TagLibraryLegacy(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <TagLibrary
        onEdit={(id) =>
          void navigate({ to: "/tags/builder/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/tags/builder" })}
      />
    </Suspense>
  );
}

export function TagBuilderLegacy(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <TagBuilder id={null} onCancel={() => void navigate({ to: "/tags" })} />
    </Suspense>
  );
}

export function TagBuilderEditLegacy(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <TagBuilder
        id={id ?? null}
        onCancel={() => void navigate({ to: "/tags" })}
      />
    </Suspense>
  );
}

export function ItemLibraryLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <ItemLibrary
        items={data.items}
        loading={data.itemsLoading}
        error={data.itemsError}
        onRefresh={data.refreshItems}
        onEdit={(id) =>
          void navigate({ to: "/items/builder/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/items/builder" })}
      />
    </Suspense>
  );
}

export function ItemBuilderLegacy(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <ItemBuilder id={null} onCancel={() => void navigate({ to: "/items" })} />
    </Suspense>
  );
}

export function ItemBuilderEditLegacy(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <ItemBuilder
        id={id ?? null}
        onCancel={() => void navigate({ to: "/items" })}
      />
    </Suspense>
  );
}

export function PersonaLibraryLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <PersonaLibrary
        personas={data.personas}
        loading={data.personasLoading}
        error={data.personasError}
        onRefresh={data.refreshPersonas}
        onEdit={(id) =>
          void navigate({ to: "/personas/builder/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/personas/builder" })}
      />
    </Suspense>
  );
}

export function PersonaBuilderLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <PersonaBuilder
        id={null}
        onSave={data.refreshPersonas}
        onCancel={() => void navigate({ to: "/personas" })}
      />
    </Suspense>
  );
}

export function PersonaBuilderEditLegacy(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const data = useLegacyData();
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <PersonaBuilder
        id={id ?? null}
        onSave={data.refreshPersonas}
        onCancel={() => void navigate({ to: "/personas" })}
      />
    </Suspense>
  );
}

export function LocationLibraryLegacy(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <LocationView onBack={() => void navigate({ to: "/" })} />
    </Suspense>
  );
}

export function LocationBuilderLegacy(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Suspense fallback={null}>
      <LocationView onBack={() => void navigate({ to: "/" })} />
    </Suspense>
  );
}

export function SessionLibraryLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  return (
    <Suspense fallback={null}>
      <SessionLibrary
        sessions={data.sessions}
        loading={data.sessionsLoading}
        error={data.sessionsError}
        onRefresh={data.refreshSessions}
        onSelect={(id: string) => {
          useSessionStore.getState().setSessionId(id);
          void navigate({ to: "/sessions/$id/chat", params: { id } });
        }}
        onDelete={(id: string) => {
          void data.handleDeleteSession(id);
        }}
        onCreateNew={() => void navigate({ to: "/sessions/builder" })}
        activeSessionId={currentSessionId}
      />
    </Suspense>
  );
}

export function SessionBuilderLegacy(): React.JSX.Element {
  const data = useLegacyData();
  const navigate = useNavigate();
  const onSessionCreated = (sessionId: string) => {
    useSessionStore.getState().setSessionId(sessionId);
    void navigate({ to: "/sessions/$id/chat", params: { id: sessionId } });
  };
  return (
    <Suspense fallback={null}>
      <SessionWorkspace
        settings={data.settings}
        settingsLoading={data.settingsLoading}
        characters={data.characters}
        charactersLoading={data.charactersLoading}
        personas={data.personas}
        personasLoading={data.personasLoading}
        tags={data.tags}
        tagsLoading={data.tagsLoading}
        onRefreshSettings={data.refreshSettings}
        onRefreshCharacters={data.refreshCharacters}
        onRefreshPersonas={data.refreshPersonas}
        onRefreshTags={data.refreshTags}
        onNavigateToSettingBuilder={() =>
          void navigate({ to: "/settings/builder" })
        }
        onNavigateToCharacterBuilder={() =>
          void navigate({ to: "/characters/studio" })
        }
        onNavigateToPersonaBuilder={() =>
          void navigate({ to: "/personas/builder" })
        }
        onCreateSession={data.onCreateSessionFull}
        onSessionCreated={onSessionCreated}
      />
    </Suspense>
  );
}

export function ChatLegacy(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  React.useEffect(() => {
    if (id) {
      useSessionStore.getState().setSessionId(id);
    }
  }, [id]);
  return (
    <Suspense fallback={null}>
      <ChatPanel sessionId={id ?? null} />
    </Suspense>
  );
}

export function DocsLegacy(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <DocsViewer />
    </Suspense>
  );
}
