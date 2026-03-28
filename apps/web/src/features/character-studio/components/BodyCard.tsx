import React, { useState } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import {
  APPEARANCE_FEET_SIZES,
  getRecordOptional,
  setPartialRecord,
  type BodyRegionData,
  type BodyMap,
  type BodyRegion,
  type RegionFlavor,
  type RegionScent,
  type RegionTexture,
  type RegionVisual,
  type ResolvedBodyMap,
} from "@arcagentic/schemas";
import {
  characterProfile,
  resolvedBodyMap,
  updateProfile,
} from "../signals.js";
import { IdentityCard } from "./IdentityCard.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegionEntry {
  label: string;
  /** Primary canonical key used for reading override state */
  primaryKey: BodyRegion;
  /** All canonical keys this entry writes to (for grouped L/R regions) */
  writeKeys: BodyRegion[];
  /** Legacy key from old 6-region layout; read as fallback, cleared on first write */
  legacyKey?: BodyRegion;
  /** Whether to show appearance fields (size/shape) - only for feet */
  showAppearance?: boolean;
}

interface RegionGroupDef {
  title: string;
  regions: RegionEntry[];
}

// ---------------------------------------------------------------------------
// Region Group Definitions
// ---------------------------------------------------------------------------

const BODY_REGION_GROUPS: RegionGroupDef[] = [
  {
    title: "Head",
    regions: [
      { label: "Hair", primaryKey: "hair", writeKeys: ["hair"] },
      { label: "Face", primaryKey: "face", writeKeys: ["face"] },
      {
        label: "Ears",
        primaryKey: "leftEar",
        writeKeys: ["leftEar", "rightEar"],
      },
      { label: "Neck", primaryKey: "neck", writeKeys: ["neck"] },
    ],
  },
  {
    title: "Upper Body",
    regions: [
      {
        label: "Shoulders",
        primaryKey: "leftShoulder",
        writeKeys: ["leftShoulder", "rightShoulder"],
      },
      { label: "Chest", primaryKey: "chest", writeKeys: ["chest"] },
      { label: "Back", primaryKey: "back", writeKeys: ["back"] },
    ],
  },
  {
    title: "Torso",
    regions: [
      {
        label: "Abdomen",
        primaryKey: "abdomen",
        writeKeys: ["abdomen"],
        legacyKey: "torso",
      },
      {
        label: "Sides",
        primaryKey: "leftSide",
        writeKeys: ["leftSide", "rightSide"],
      },
      {
        label: "Hips",
        primaryKey: "leftHip",
        writeKeys: ["leftHip", "rightHip"],
      },
    ],
  },
  {
    title: "Arms",
    regions: [
      {
        label: "Arms",
        primaryKey: "leftArm",
        writeKeys: ["leftArm", "rightArm"],
      },
      {
        label: "Hands",
        primaryKey: "leftHand",
        writeKeys: ["leftHand", "rightHand"],
        legacyKey: "hands",
      },
      {
        label: "Fingers",
        primaryKey: "leftFingers",
        writeKeys: ["leftFingers", "rightFingers"],
      },
    ],
  },
  {
    title: "Legs",
    regions: [
      {
        label: "Thighs",
        primaryKey: "leftThigh",
        writeKeys: ["leftThigh", "rightThigh"],
      },
      {
        label: "Knees",
        primaryKey: "leftKnee",
        writeKeys: ["leftKnee", "rightKnee"],
      },
      {
        label: "Calves",
        primaryKey: "leftCalf",
        writeKeys: ["leftCalf", "rightCalf"],
      },
    ],
  },
  {
    title: "Feet",
    regions: [
      {
        label: "Feet",
        primaryKey: "leftFoot",
        writeKeys: ["leftFoot", "rightFoot"],
        showAppearance: true,
      },
      { label: "Toes", primaryKey: "toes", writeKeys: ["toes"] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Data Helpers
// ---------------------------------------------------------------------------

function readOverride(
  body: BodyMap,
  entry: RegionEntry,
): BodyRegionData | undefined {
  const primary = getRecordOptional(body, entry.primaryKey);
  if (primary) return primary;
  if (entry.legacyKey) return getRecordOptional(body, entry.legacyKey);
  return undefined;
}

function readResolved(
  resolved: ResolvedBodyMap,
  entry: RegionEntry,
): BodyRegionData | undefined {
  // Cast to BodyMap to avoid ResolvedBodyMap._meta leaking into the value type
  const map: BodyMap = resolved;
  const primary = getRecordOptional(map, entry.primaryKey);
  if (primary) return primary;
  if (entry.legacyKey) return getRecordOptional(map, entry.legacyKey);
  return undefined;
}

function groupHasOverrides(body: BodyMap, group: RegionGroupDef): boolean {
  return group.regions.some((entry) => readOverride(body, entry) !== undefined);
}

// ---------------------------------------------------------------------------
// Pure update logic (shared by single-key and grouped writes)
// ---------------------------------------------------------------------------

function applyRegionUpdate(
  current: BodyRegionData | undefined,
  updates: Partial<BodyRegionData>,
): BodyRegionData | undefined {
  const next: BodyRegionData = { ...(current ?? {}) };

  if ("visual" in updates) {
    if (updates.visual) next.visual = updates.visual;
    else delete next.visual;
  }
  if ("scent" in updates) {
    if (updates.scent) next.scent = updates.scent;
    else delete next.scent;
  }
  if ("texture" in updates) {
    if (updates.texture) next.texture = updates.texture;
    else delete next.texture;
  }
  if ("flavor" in updates) {
    if (updates.flavor) next.flavor = updates.flavor;
    else delete next.flavor;
  }
  if ("appearance" in updates) {
    if (updates.appearance) next.appearance = updates.appearance;
    else delete next.appearance;
  }

  const hasAny = Boolean(
    next.visual ?? next.scent ?? next.texture ?? next.flavor ?? next.appearance,
  );
  return hasAny ? next : undefined;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const INPUT_CLASS =
  "w-full bg-slate-900 text-slate-200 rounded-md pl-3 pr-7 py-1.5 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm";

/** Small clearable text input with embedded "x" button. */
const ClearableInput: React.FC<{
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClear: () => void;
  label: string;
}> = ({ value, placeholder, onChange, onClear, label }) => (
  <div className="relative">
    <input
      type="text"
      className={INPUT_CLASS}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    />
    {value && (
      <button
        type="button"
        onClick={onClear}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
        aria-label={`Clear ${label}`}
      >
        <X size={12} />
      </button>
    )}
  </div>
);

/** Renders the sensory inputs for a single region entry. */
const RegionRow: React.FC<{
  label: string;
  overrideData: BodyRegionData | undefined;
  resolvedData: BodyRegionData | undefined;
  showAppearance?: boolean;
  onUpdate: (updates: Partial<BodyRegionData>) => void;
}> = ({ label, overrideData, resolvedData, showAppearance, onUpdate }) => {
  // --- Visual ---
  const visualValue = overrideData?.visual?.description ?? "";
  const visualPlaceholder = resolvedData?.visual?.description ?? "Visual...";

  const handleVisualChange = (description: string): void => {
    const nextVisual: RegionVisual | undefined = description
      ? {
          description,
          features: overrideData?.visual?.features,
          skinCondition: overrideData?.visual?.skinCondition,
        }
      : undefined;
    onUpdate({ visual: nextVisual });
  };

  // --- Scent ---
  const scentValue = overrideData?.scent?.primary ?? "";
  const scentPlaceholder = resolvedData?.scent?.primary ?? "Scent...";

  const handleScentChange = (primary: string): void => {
    const nextScent: RegionScent | undefined = primary
      ? {
          primary,
          notes: overrideData?.scent?.notes,
          intensity: overrideData?.scent?.intensity ?? 0.5,
        }
      : undefined;
    onUpdate({ scent: nextScent });
  };

  // --- Texture ---
  const textureValue = overrideData?.texture?.primary ?? "";
  const texturePlaceholder = resolvedData?.texture?.primary ?? "Texture...";

  const handleTextureChange = (primary: string): void => {
    const nextTexture: RegionTexture | undefined = primary
      ? {
          primary,
          temperature: overrideData?.texture?.temperature ?? "neutral",
          moisture: overrideData?.texture?.moisture ?? "normal",
          notes: overrideData?.texture?.notes,
        }
      : undefined;
    onUpdate({ texture: nextTexture });
  };

  // --- Flavor ---
  const flavorValue = overrideData?.flavor?.primary ?? "";
  const flavorPlaceholder = resolvedData?.flavor?.primary ?? "Flavor...";

  const handleFlavorChange = (primary: string): void => {
    const nextFlavor: RegionFlavor | undefined = primary
      ? {
          primary,
          notes: overrideData?.flavor?.notes,
          intensity: overrideData?.flavor?.intensity ?? 0.5,
        }
      : undefined;
    onUpdate({ flavor: nextFlavor });
  };

  // --- Appearance (feet only) ---
  const handleAppearanceChange = (
    key: "size" | "shape",
    value: string,
  ): void => {
    const currentAppearance = { ...(overrideData?.appearance ?? {}) };
    if (value) {
      currentAppearance[key] = value;
    } else {
      delete currentAppearance[key];
    }
    const hasAny = Object.keys(currentAppearance).length > 0;
    onUpdate({ appearance: hasAny ? currentAppearance : undefined });
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-slate-400 font-medium">{label}</span>

      <ClearableInput
        value={visualValue}
        placeholder={visualPlaceholder}
        onChange={handleVisualChange}
        onClear={() => onUpdate({ visual: undefined })}
        label={`${label} visual`}
      />

      <div className="grid grid-cols-3 gap-1.5">
        <ClearableInput
          value={scentValue}
          placeholder={scentPlaceholder}
          onChange={handleScentChange}
          onClear={() => onUpdate({ scent: undefined })}
          label={`${label} scent`}
        />
        <ClearableInput
          value={textureValue}
          placeholder={texturePlaceholder}
          onChange={handleTextureChange}
          onClear={() => onUpdate({ texture: undefined })}
          label={`${label} texture`}
        />
        <ClearableInput
          value={flavorValue}
          placeholder={flavorPlaceholder}
          onChange={handleFlavorChange}
          onClear={() => onUpdate({ flavor: undefined })}
          label={`${label} flavor`}
        />
      </div>

      {showAppearance && (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <select
              value={overrideData?.appearance?.["size"] ?? ""}
              onChange={(e) => handleAppearanceChange("size", e.target.value)}
              className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-1.5 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
              aria-label={`${label} size`}
            >
              <option value="">Size...</option>
              {APPEARANCE_FEET_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <ClearableInput
            value={overrideData?.appearance?.["shape"] ?? ""}
            placeholder="Shape..."
            onChange={(v) => handleAppearanceChange("shape", v)}
            onClear={() => handleAppearanceChange("shape", "")}
            label={`${label} shape`}
          />
        </div>
      )}
    </div>
  );
};

/** Collapsible group of region entries. */
const RegionGroup: React.FC<{
  group: RegionGroupDef;
  defaultOpen: boolean;
  body: BodyMap;
  resolved: ResolvedBodyMap;
  onUpdateGrouped: (
    entry: RegionEntry,
    updates: Partial<BodyRegionData>,
  ) => void;
}> = ({ group, defaultOpen, body, resolved, onUpdateGrouped }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1.5 py-1.5 text-sm text-slate-300 hover:text-slate-100 transition-colors w-full"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium tracking-wide">{group.title}</span>
      </button>

      {isOpen && (
        <div className="pl-5 space-y-3 pb-2">
          {group.regions.map((entry) => (
            <RegionRow
              key={entry.primaryKey}
              label={entry.label}
              overrideData={readOverride(body, entry)}
              resolvedData={readResolved(resolved, entry)}
              showAppearance={entry.showAppearance === true}
              onUpdate={(updates) => onUpdateGrouped(entry, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * BodyCard renders ~20 region entries organized in 6 collapsible groups.
 * Each region shows sensory override inputs (visual, scent, texture, flavor)
 * with computed classification defaults as placeholder text.
 */
export const BodyCard: React.FC<{ hasContent?: boolean }> = ({
  hasContent,
}) => {
  useSignals();

  const body: BodyMap = characterProfile.value.body ?? {};
  const resolved = resolvedBodyMap.value;

  // Expand groups that already have user overrides on initial render
  const [expandedGroups] = useState<Set<string>>(() => {
    const initialBody: BodyMap = characterProfile.value.body ?? {};
    const expanded = new Set<string>();
    for (const group of BODY_REGION_GROUPS) {
      if (groupHasOverrides(initialBody, group)) {
        expanded.add(group.title);
      }
    }
    return expanded;
  });

  /**
   * Writes updates to all writeKeys for a grouped entry in a single signal
   * update. Migrates legacy data on first write so old overrides are preserved.
   */
  const handleUpdateGrouped = (
    entry: RegionEntry,
    updates: Partial<BodyRegionData>,
  ): void => {
    const nextBody: BodyMap = { ...body };

    // Migrate legacy data to writeKeys on first write
    if (entry.legacyKey) {
      const legacyData = getRecordOptional(body, entry.legacyKey);
      if (legacyData && !getRecordOptional(body, entry.primaryKey)) {
        for (const key of entry.writeKeys) {
          setPartialRecord(nextBody, key, { ...legacyData });
        }
        setPartialRecord(nextBody, entry.legacyKey, undefined);
      }
    }

    // Apply field-specific updates to every writeKey
    for (const key of entry.writeKeys) {
      const current = getRecordOptional(nextBody, key);
      const next = applyRegionUpdate(current, updates);
      setPartialRecord(nextBody, key, next);
    }

    updateProfile("body", nextBody);
  };

  return (
    <IdentityCard
      title="Body Region Overrides"
      defaultOpen={false}
      hasContent={hasContent}
      cardId="body"
    >
      <div className="space-y-1">
        <p className="text-xs text-slate-500 mb-3">
          Override computed defaults for any body region. Placeholder text shows
          the current computed default.
        </p>

        {BODY_REGION_GROUPS.map((group) => (
          <RegionGroup
            key={group.title}
            group={group}
            defaultOpen={expandedGroups.has(group.title)}
            body={body}
            resolved={resolved}
            onUpdateGrouped={handleUpdateGrouped}
          />
        ))}
      </div>
    </IdentityCard>
  );
};
