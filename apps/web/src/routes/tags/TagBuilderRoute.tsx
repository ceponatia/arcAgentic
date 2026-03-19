import React, { Suspense } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

const TagBuilder = React.lazy(async () => {
  const mod = await import("../../features/tag-builder/TagBuilder.js");
  return { default: mod.TagBuilder };
});

export function TagBuilderRoute(): React.JSX.Element {
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
