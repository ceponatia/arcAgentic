import React, { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useItems } from "../../shared/hooks/useItems.js";

const ItemLibrary = React.lazy(async () => {
  const mod = await import("../../features/library/index.js");
  return { default: mod.ItemLibrary };
});

export function ItemLibraryRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { loading, error, data, retry } = useItems();

  return (
    <Suspense fallback={null}>
      <ItemLibrary
        items={data ?? []}
        loading={loading}
        error={error}
        onRefresh={retry}
        onEdit={(id) =>
          void navigate({ to: "/items/builder/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/items/builder" })}
      />
    </Suspense>
  );
}
