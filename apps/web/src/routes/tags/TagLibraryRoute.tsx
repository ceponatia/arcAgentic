import React, { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";

const TagLibrary = React.lazy(async () => {
  const mod = await import("../../features/library/index.js");
  return { default: mod.TagLibrary };
});

export function TagLibraryRoute(): React.JSX.Element {
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
