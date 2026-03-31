import {
  APPEAL_TAG_CATEGORIES,
  BUILT_IN_APPEAL_TAGS,
  MAX_PERSONA_APPEAL_TAGS,
} from "@arcagentic/schemas";

interface AppealTagPickerProps {
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  error?: string | undefined;
}

function getCategoryLabel(
  category: (typeof APPEAL_TAG_CATEGORIES)[number],
): string {
  switch (category) {
    case "body":
      return "Body Features";
    case "sensory":
      return "Sensory Qualities";
  }
}

export function AppealTagPicker({
  selectedIds,
  onChange,
  error,
}: AppealTagPickerProps) {
  const hasReachedLimit = selectedIds.length >= MAX_PERSONA_APPEAL_TAGS;

  const handleToggle = (tagId: string) => {
    const isSelected = selectedIds.includes(tagId);

    if (isSelected) {
      onChange(selectedIds.filter((selectedId) => selectedId !== tagId));
      return;
    }

    if (hasReachedLimit) {
      return;
    }

    onChange([...selectedIds, tagId]);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        {selectedIds.length} / {MAX_PERSONA_APPEAL_TAGS} selected
      </p>

      {APPEAL_TAG_CATEGORIES.map((category) => {
        const categoryTags = BUILT_IN_APPEAL_TAGS.filter(
          (tag) => tag.category === category,
        );

        return (
          <div
            key={category}
            className="bg-slate-800/50 rounded-lg p-4 space-y-4"
          >
            <h4 className="text-sm font-medium text-slate-400">
              {getCategoryLabel(category)}
            </h4>

            <div className="flex flex-wrap gap-2">
              {categoryTags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                const isDisabled = !isSelected && hasReachedLimit;
                const buttonClasses = isSelected
                  ? "bg-violet-900/30 text-violet-300 ring-1 ring-violet-700"
                  : isDisabled
                    ? "bg-slate-800/30 text-slate-500 ring-1 ring-slate-800 cursor-not-allowed opacity-50"
                    : "bg-slate-800/60 text-slate-300 ring-1 ring-slate-700 hover:ring-slate-600";

                return (
                  <button
                    key={tag.id}
                    type="button"
                    title={tag.description}
                    disabled={isDisabled}
                    onClick={() => {
                      handleToggle(tag.id);
                    }}
                    className={`rounded-md px-3 py-2 text-left transition-colors ${buttonClasses}`}
                  >
                    <span className="block text-sm font-medium">
                      {tag.label}
                    </span>
                    <span className="mt-1 block text-xs text-inherit/80">
                      {tag.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
