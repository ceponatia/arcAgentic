/**
 * Setting Step - Select or configure the world setting
 */

import React from "react";
import { useWorkspaceStore, useSettingState } from "../store.js";
import { SelectableCard } from "../components/SelectableCard.js";
import type { SettingSummary } from "../../../types.js";
import { getSetting } from "../../../shared/api/client.js";
import {
  formatDefaultStartTime,
  formatStartTime,
  resolveTimeConfig,
  toResolvedStartTime,
} from "../time-config.js";

interface SettingStepProps {
  settings: SettingSummary[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateToBuilder: () => void;
}

export const SettingStep: React.FC<SettingStepProps> = ({
  settings,
  loading,
  onRefresh,
  onNavigateToBuilder,
}) => {
  const settingState = useSettingState();
  const { selectSetting, clearSetting, updateSetting } = useWorkspaceStore();
  const [loadingSettingId, setLoadingSettingId] = React.useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const latestRequestIdRef = React.useRef(0);
  const hasCustomStartTime = Boolean(settingState.startTime);
  const timeConfig = resolveTimeConfig(settingState.settingProfile);
  const resolvedStartTime = toResolvedStartTime(
    settingState.startTime,
    timeConfig,
  );
  const monthNames = timeConfig.calendar?.monthNames ?? [];
  const defaultTimeLabel = formatDefaultStartTime(timeConfig);

  const handleSelectSetting = async (setting: SettingSummary) => {
    const isSameSelection = settingState.settingId === setting.id;
    const requestId = latestRequestIdRef.current + 1;

    latestRequestIdRef.current = requestId;

    setLoadError(null);
    setLoadingSettingId(setting.id);

    try {
      const profile = await getSetting(setting.id);

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      const nextTimeConfig = resolveTimeConfig(profile);

      selectSetting(setting.id, profile);

      if (!isSameSelection) {
        updateSetting({
          startTime: settingState.startTime
            ? toResolvedStartTime(settingState.startTime, nextTimeConfig)
            : undefined,
          secondsPerTurn: nextTimeConfig.secondsPerTurn,
        });
      }
    } catch (error) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load setting profile",
      );
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoadingSettingId((current) =>
          current === setting.id ? null : current,
        );
      }
    }
  };

  const handleCustomTimeToggle = (enabled: boolean) => {
    updateSetting({
      startTime: enabled
        ? toResolvedStartTime(settingState.startTime, timeConfig)
        : undefined,
    });
  };

  const handleStartTimeChange = (
    field: "year" | "month" | "day" | "hour" | "minute",
    value: number,
  ) => {
    updateSetting({
      startTime: {
        ...resolvedStartTime,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">
          Choose Your Setting
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Select a world for your adventure. Each setting defines the lore,
          tone, and atmosphere.
        </p>
      </div>

      {/* Setting Selection Grid */}
      <div className="border border-slate-800 rounded-lg bg-slate-900/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            Available Settings
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={onNavigateToBuilder}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              + Create New
            </button>
          </div>
        </div>

        <div className="p-4">
          {loadError && (
            <p className="mb-3 rounded border border-red-800/60 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {loadError}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Loading settings...
            </p>
          ) : settings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-3">
                No settings available
              </p>
              <button
                onClick={onNavigateToBuilder}
                className="text-sm px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-500"
              >
                Create Your First Setting
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {settings.map((setting) => (
                <SelectableCard
                  key={setting.id}
                  title={setting.name}
                  description={setting.tone}
                  selected={settingState.settingId === setting.id}
                  onClick={() => void handleSelectSetting(setting)}
                  badges={
                    loadingSettingId === setting.id ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        Loading...
                      </span>
                    ) : settingState.settingId === setting.id ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-violet-600/30 text-violet-300">
                        Selected
                      </span>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Configuration */}
      {settingState.settingId && (
        <div className="border border-slate-800 rounded-lg bg-slate-900/30">
          <div className="px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-medium text-slate-300">
              Time Configuration
            </span>
          </div>

          <div className="px-4 py-4 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Seconds Per Turn
              </label>
              <input
                type="number"
                min={1}
                value={settingState.secondsPerTurn ?? timeConfig.secondsPerTurn}
                onChange={(e) =>
                  updateSetting({
                    secondsPerTurn: Math.max(
                      1,
                      parseInt(e.target.value || "1", 10),
                    ),
                  })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
              />
              <p className="mt-1 text-xs text-slate-500">
                Setting default: {timeConfig.secondsPerTurn}s per turn.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded border border-slate-800 bg-slate-800/40 px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCustomStartTime}
                onChange={(e) => {
                  handleCustomTimeToggle(e.target.checked);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-violet-600"
              />
              <span>
                <span className="block text-sm font-medium text-slate-200">
                  Set explicit session start time
                </span>
                <span className="block text-xs text-slate-500 mt-1">
                  Override the default start of the session with a full in-world
                  date and time.
                </span>
                {!hasCustomStartTime && (
                  <span className="block text-xs text-slate-500 mt-1">
                    Current default: {defaultTimeLabel}
                  </span>
                )}
              </span>
            </label>

            {hasCustomStartTime && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={resolvedStartTime.year}
                      onChange={(e) => {
                        handleStartTimeChange(
                          "year",
                          Math.max(1, parseInt(e.target.value || "1", 10)),
                        );
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Month
                    </label>
                    <select
                      value={resolvedStartTime.month}
                      onChange={(e) => {
                        handleStartTimeChange(
                          "month",
                          parseInt(e.target.value, 10),
                        );
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                    >
                      {Array.from(
                        { length: timeConfig.monthsPerYear },
                        (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {monthNames[i] ?? i + 1}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Day
                    </label>
                    <select
                      value={resolvedStartTime.day}
                      onChange={(e) => {
                        handleStartTimeChange(
                          "day",
                          parseInt(e.target.value, 10),
                        );
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                    >
                      {Array.from(
                        { length: timeConfig.daysPerMonth },
                        (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Hour
                    </label>
                    <select
                      value={resolvedStartTime.hour}
                      onChange={(e) => {
                        handleStartTimeChange(
                          "hour",
                          parseInt(e.target.value, 10),
                        );
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                    >
                      {Array.from(
                        { length: timeConfig.hoursPerDay },
                        (_, i) => (
                          <option key={i} value={i}>
                            {i.toString().padStart(2, "0")}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Minute
                    </label>
                    <select
                      value={resolvedStartTime.minute}
                      onChange={(e) => {
                        handleStartTimeChange(
                          "minute",
                          parseInt(e.target.value, 10),
                        );
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200"
                    >
                      {[0, 15, 30, 45].map((minute) => (
                        <option key={minute} value={minute}>
                          {minute.toString().padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Setting Summary */}
      {settingState.settingId && settingState.settingProfile && (
        <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-400">Selected Setting</p>
              <p className="font-medium text-slate-200">
                {settingState.settingProfile.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {hasCustomStartTime
                  ? formatStartTime(settingState.startTime, timeConfig)
                  : `Uses setting default: ${defaultTimeLabel}`}
              </p>
            </div>
            <button
              onClick={clearSetting}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
