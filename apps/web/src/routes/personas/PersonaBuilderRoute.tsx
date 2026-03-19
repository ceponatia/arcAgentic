import React, { Suspense } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { usePersonas } from "../../shared/hooks/usePersonas.js";

const PersonaBuilder = React.lazy(async () => {
  const mod = await import("../../features/persona-builder/PersonaBuilder.js");
  return { default: mod.PersonaBuilder };
});

export function PersonaBuilderRoute(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { retry } = usePersonas();

  return (
    <Suspense fallback={null}>
      <PersonaBuilder
        id={id ?? null}
        onSave={retry}
        onCancel={() => void navigate({ to: "/personas" })}
      />
    </Suspense>
  );
}
