import React from "react";
import { NavItems } from "./NavItems.js";
import { DocumentIcon } from "./ShellComponents.js";
import type { NavController } from "../routes/LegacyNavAdapter.js";

interface SidebarProps {
  controller: NavController;
}

/**
 * Desktop sidebar navigation component.
 */
export const Sidebar: React.FC<SidebarProps> = ({ controller }) => {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={() => controller.navigateToHome()}
          className="text-lg font-semibold text-slate-100 hover:text-violet-400 transition-colors"
        >
          arcagentic
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavItems controller={controller} />
      </nav>
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={() => controller.navigateToDocs()}
          className="flex items-center gap-2 w-full text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <DocumentIcon className="w-4 h-4" />
          <span>Documentation</span>
        </button>
      </div>
    </aside>
  );
};
