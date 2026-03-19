import React, { Suspense } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCharacters } from "../../shared/hooks/useCharacters.js";
import type { CharacterStudioProps } from "../../features/character-studio/index.js";

const CharacterStudio = React.lazy(async () => {
  const mod = (await import("../../features/character-studio/index.js")) as {
    CharacterStudio: React.ComponentType<CharacterStudioProps>;
  };
  return { default: mod.CharacterStudio };
});

export function CharacterStudioRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false });
  const { retry: refreshCharacters } = useCharacters();

  return (
    <Suspense fallback={null}>
      <CharacterStudio
        id={id ?? null}
        onSave={refreshCharacters}
        onCancel={() => void navigate({ to: "/characters" })}
      />
    </Suspense>
  );
}
