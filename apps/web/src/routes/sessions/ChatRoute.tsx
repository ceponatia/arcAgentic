import React, { Suspense, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useSessionStore } from "../../shared/stores/session-store.js";

const ChatPanel = React.lazy(async () => {
  const mod = await import("../../features/chat-panel/index.js");
  return { default: mod.ChatPanel };
});

export function ChatRoute(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const setSessionId = useSessionStore((s) => s.setSessionId);

  useEffect(() => {
    if (id) {
      setSessionId(id);
    }
    return () => {
      setSessionId(null);
    };
  }, [id, setSessionId]);

  return (
    <Suspense fallback={null}>
      <ChatPanel sessionId={id ?? null} />
    </Suspense>
  );
}
