import React, { Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSettings } from "../../shared/hooks/useSettings.js";

const SettingLibrary = React.lazy(async () => {
  const mod = await import("../../features/library/index.js");
  return { default: mod.SettingLibrary };
});

export function SettingLibraryRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { loading, error, data, retry } = useSettings();

  return (
    <Suspense fallback={null}>
      <SettingLibrary
        settings={data ?? []}
        loading={loading}
        error={error}
        onRefresh={retry}
        onEdit={(id) =>
          void navigate({ to: "/settings/builder/$id", params: { id } })
        }
        onCreateNew={() => void navigate({ to: "/settings/builder" })}
      />
    </Suspense>
  );
}
