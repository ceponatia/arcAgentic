import React, { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { deleteSession } from "../../shared/api/client.js";
import { useSessions } from "../../shared/hooks/useSessions.js";
import { useSessionStore } from "../../shared/stores/session-store.js";

const SessionLibrary = React.lazy(async () => {
  const mod = await import("../../features/library/index.js");
  return { default: mod.SessionLibrary };
});

export function SessionLibraryRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const { loading, error, data, refresh } = useSessions();

  async function handleDeleteSession(id: string): Promise<void> {
    if (!confirm("Are you sure you want to delete this session?")) {
      return;
    }

    try {
      await deleteSession(id);
      if (id === currentSessionId) {
        useSessionStore.getState().setSessionId(null);
      }
      refresh();
    } catch (deleteError) {
      console.error("Failed to delete session", deleteError);
      alert("Failed to delete session");
    }
  }

  return (
    <Suspense fallback={null}>
      <SessionLibrary
        sessions={data ?? []}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onSelect={(id: string) => {
          useSessionStore.getState().setSessionId(id);
          void navigate({ to: "/sessions/$id/chat", params: { id } });
        }}
        onDelete={(id: string) => {
          void handleDeleteSession(id);
        }}
        onCreateNew={() => void navigate({ to: "/sessions/builder" })}
        activeSessionId={currentSessionId}
      />
    </Suspense>
  );
}
