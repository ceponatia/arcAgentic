import React, { useState } from "react";
import { DocNavigation } from "./components/DocNavigation.js";
import { DocPage } from "./components/DocPage.js";

export const DocsViewer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState("index");

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  return (
    <div className="flex h-full bg-slate-950">
      <DocNavigation currentPath={currentPath} onNavigate={handleNavigate} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <DocPage path={currentPath} />
        </div>
      </div>
    </div>
  );
};
