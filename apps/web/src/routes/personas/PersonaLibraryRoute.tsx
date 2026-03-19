import React, { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePersonas } from "../../shared/hooks/usePersonas.js";

const PersonaLibrary = React.lazy(async () => {
  const mod = await import("../../features/library/index.js");
  return { default: mod.PersonaLibrary };
});

export function PersonaLibraryRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { loading, error, data, retry } = usePersonas();

  return (
    <Suspense fallback={null}>
      <PersonaLibrary
        personas={data ?? []}
        loading={loading}
        error={error}
        onRefresh={retry}
        onEdit={(id) =>
          void navigate({ to: "/personas/builder/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/personas/builder" })}
      />
    </Suspense>
  );
}
