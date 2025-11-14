---
name: phase-4-quality-and-rp-depth
description: Improve roleplay quality through prompt tuning, style metadata, and lightweight safeguards.
---

## Tune Prompts: Rich Narration
- Emphasize vivid, sensory description and specific details over generic filler.
- Mix third-person narration with natural dialogue; vary cadence for scene pacing.
- Keep replies self-contained enough to advance the scene with momentum.

## Tune Prompts: Consistent POV & Tone
- Maintain a consistent narrative POV aligned with the selected character and setting.
- Match tone to the setting’s `tone` and the character’s `speakingStyle` and personality.
- Avoid meta-commentary; never break character or mention being an AI or model.

## Tune Prompts: World Continuity
- Track facts, locations, names, and unresolved threads; honor prior events.
- Use recent history (last N turns) to preserve continuity and callbacks.
- Respect setting constraints and character goals when proposing next actions.

## Style Fields in Character JSON
- Introduce optional style attributes to shape outputs, e.g., `sentenceLength`, `humor`, `darkness`, `pacing`, `formality`, `verbosity`.
- Treat all style fields as hints; apply default behavior when fields are absent.
- Ensure schemas validate non-empty strings or constrained enums where appropriate.
- Keep imports ESM-correct and reuse shared Zod schemas for validation.

## Boundaries & Safety Handling
- Include clear guidance to fade-to-black or elide explicit content while preserving story flow.
- Redirect sensitive topics to implied or off-screen treatment; keep tone respectful.
- Avoid graphic content; prefer suggestive narration that maintains immersion.

## Safeguards: Context & Token Limits
- Cap history length by tokens or turns; favor a recency window plus a compact summary.
- Summarize older context when needed to stay within the configured context size.
- Keep prompts lean; include only rules, profiles, setting, and the most relevant turns.

## Safeguards: Simple Content Filter
- Add a lightweight check for disallowed themes; respond with a safe alternative.
- Prefer gentle refusal with in-character redirection when boundaries are reached.
- Log filtered events for debugging without storing sensitive content.

## Definition of Done
- Prompts reliably produce rich, character-faithful narration with consistent POV and tone.
- Optional style fields influence outputs without breaking when absent.
- History truncation and simple filtering work without degrading normal play.