import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { DevNews } from "../features/dev-news/index.js";

export function HomeRoute(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="max-w-5xl mx-auto py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        <div className="text-center lg:text-left pt-6 lg:pt-10">
          <h1 className="text-3xl font-semibold text-slate-100 mb-4">
            Welcome to ArcAgentic
          </h1>
          <p className="text-slate-400 mb-8">
            Create characters, build settings, and start immersive roleplay
            sessions.
          </p>
          <div className="flex flex-wrap justify-center lg:justify-start gap-3">
            <button
              onClick={() => void navigate({ to: "/characters/studio" })}
              className="px-4 py-2 rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              Create Character
            </button>
            <button
              onClick={() => void navigate({ to: "/settings/builder" })}
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Create Setting
            </button>
            <button
              onClick={() => void navigate({ to: "/items/builder" })}
              className="px-4 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Create Item
            </button>
          </div>
          <div className="mt-6 text-xs text-slate-500">
            Alpha note: expect frequent updates and occasional breaking changes.
          </div>
        </div>
        <div className="lg:pt-6">
          <DevNews />
        </div>
      </div>
    </div>
  );
}
