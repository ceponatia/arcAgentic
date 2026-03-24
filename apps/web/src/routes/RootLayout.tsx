import React, { useState } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AppFooter } from "../layouts/AppFooter.js";
import { Sidebar } from "../layouts/Sidebar.js";
import { ShellHeader } from "../layouts/ShellHeader.js";
import { MobileDrawer } from "../layouts/MobileDrawer.js";

export function RootLayout(): React.JSX.Element {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFullscreenRoute =
    pathname.startsWith("/characters/studio") ||
    /^\/sessions\/[^/]+\/chat$/.test(pathname);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans flex flex-col">
      <ShellHeader onMenuClick={() => setNavOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div
            id="app-main-view"
            className={`flex-1 ${
              isFullscreenRoute
                ? "overflow-hidden"
                : "overflow-y-auto custom-scrollbar p-4 md:p-6"
            }`}
          >
            <Outlet />
          </div>
          <AppFooter />
        </main>
      </div>
      <MobileDrawer isOpen={navOpen} onClose={() => setNavOpen(false)} />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}
