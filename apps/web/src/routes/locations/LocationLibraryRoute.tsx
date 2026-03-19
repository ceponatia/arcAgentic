import React, { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";

const LocationView = React.lazy(async () => {
  const mod = await import("../../features/locations/index.js");
  return { default: mod.LocationView };
});

export function LocationLibraryRoute(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <Suspense fallback={null}>
      <LocationView onBack={() => void navigate({ to: "/" })} />
    </Suspense>
  );
}
