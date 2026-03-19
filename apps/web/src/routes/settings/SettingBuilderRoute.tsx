import React, { Suspense } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useSettings } from "../../shared/hooks/useSettings.js";

const SettingBuilder = React.lazy(async () => {
  const mod = await import("../../features/setting-builder/index.js");
  return { default: mod.SettingBuilder };
});

export function SettingBuilderRoute(): React.JSX.Element {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { retry } = useSettings();

  return (
    <Suspense fallback={null}>
      <SettingBuilder
        id={id ?? null}
        onSave={() => {
          void retry();
        }}
        onCancel={() => void navigate({ to: "/settings" })}
        onNavigate={(opts) => {
          void navigate(opts);
        }}
      />
    </Suspense>
  );
}
