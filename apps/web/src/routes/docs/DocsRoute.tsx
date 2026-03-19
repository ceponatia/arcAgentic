import React, { Suspense } from "react";

const DocsViewer = React.lazy(async () => {
  const mod = await import("../../features/docs/index.js");
  return { default: mod.DocsViewer };
});

export function DocsRoute(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <DocsViewer />
    </Suspense>
  );
}
