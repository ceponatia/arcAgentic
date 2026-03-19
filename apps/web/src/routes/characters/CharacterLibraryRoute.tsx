import React, { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCharacters } from "../../shared/hooks/useCharacters.js";

const CharacterLibrary = React.lazy(async () => {
  const mod = await import("../../features/library/index.js");
  return { default: mod.CharacterLibrary };
});

export function CharacterLibraryRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { loading, error, data, retry } = useCharacters();

  return (
    <Suspense fallback={null}>
      <CharacterLibrary
        characters={data ?? []}
        loading={loading}
        error={error}
        onRefresh={retry}
        onEdit={(id) =>
          void navigate({ to: "/characters/studio/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/characters/studio" })}
      />
    </Suspense>
  );
}
