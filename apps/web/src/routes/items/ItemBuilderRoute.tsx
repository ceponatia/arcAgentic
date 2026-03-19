import React, { Suspense } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

const ItemBuilder = React.lazy(async () => {
  const mod = await import("../../features/item-builder/index.js");
  return { default: mod.ItemBuilder };
});

export function ItemBuilderRoute(): React.JSX.Element {
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
