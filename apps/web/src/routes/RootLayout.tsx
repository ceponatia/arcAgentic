import React, { useState } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AppFooter } from "../layouts/AppFooter.js";
import { Sidebar } from "../layouts/Sidebar.js";
import { ShellHeader } from "../layouts/ShellHeader.js";
import { MobileDrawer } from "../layouts/MobileDrawer.js";
import { useLegacyNavAdapter } from "./LegacyNavAdapter.js";
import { LegacyDataProvider } from "./LegacyDataContext.js";
import type { ViewMode } from "../types.js";

// Same function as in LegacyNavAdapter - duplicated to avoid circular deps
function pathToViewMode(pathname: string): ViewMode {
  if (pathname === "/") return "home";
  if (pathname === "/characters") return "character-library";
  if (pathname.startsWith("/characters/studio")) return "character-studio";
  if (pathname === "/settings") return "setting-library";
  if (pathname.startsWith("/settings/builder")) return "setting-builder";
  if (pathname === "/tags") return "tag-library";
  if (pathname.startsWith("/tags/builder")) return "tag-builder";
  if (pathname === "/items") return "item-library";
  if (pathname.startsWith("/items/builder")) return "item-builder";
  if (pathname === "/personas") return "persona-library";
  if (pathname.startsWith("/personas/builder")) return "persona-builder";
  if (pathname === "/locations") return "location-library";
  if (pathname.startsWith("/locations/builder")) return "location-builder";
  if (pathname === "/sessions") return "session-library";
  if (pathname === "/sessions/builder") return "session-builder";
  if (/^\/sessions\/[^/]+\/chat$/.exec(pathname)) return "chat";
  if (pathname === "/docs") return "docs";
  return "home";
}

export function RootLayout(): React.JSX.Element {
  const [navOpen, setNavOpen] = useState(false);
  const controller = useLegacyNavAdapter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const viewMode = pathToViewMode(pathname);

  return (
    <LegacyDataProvider viewMode={viewMode}>
      <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans flex flex-col">
        <ShellHeader
          onMenuClick={() => setNavOpen(true)}
          onLogoClick={() => controller.navigateToHome()}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar controller={controller} />
          <main className="flex-1 flex flex-col overflow-hidden">
            <div
              id="app-main-view"
              className={`flex-1 ${
                ["chat", "character-studio"].includes(viewMode)
                  ? "overflow-hidden"
                  : "overflow-y-auto custom-scrollbar p-4 md:p-6"
              }`}
            >
              <Outlet />
            </div>
            <AppFooter />
          </main>
        </div>
        <MobileDrawer
          isOpen={navOpen}
          onClose={() => setNavOpen(false)}
          controller={controller}
        />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </div>
    </LegacyDataProvider>
  );
}
