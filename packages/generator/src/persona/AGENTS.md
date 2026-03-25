# Persona Generator Domain

## Purpose

Random and template-based generation of player personas (`PersonaProfile`). Simpler than the character generator - no personality, backstory, or NPC-specific fields. Reuses ~50% of character generator infrastructure.

## Status: Not Implemented

Scoped in PL08 PH04 (2026-03-25). Ready for implementation as a single session (~300 lines of new code).

## Target Schema

Generates `PersonaProfile` from `@arcagentic/schemas`:

| Field        | Type                 | Required | Generation Strategy                                               |
| ------------ | -------------------- | -------- | ----------------------------------------------------------------- |
| `id`         | `string`             | Yes      | `generateId()`                                                    |
| `name`       | `string`             | Yes      | Reuse character name pools (gender-aware)                         |
| `age`        | `number`             | Optional | `randomInt()` within theme `ageRange` (default `[18, 50]`)        |
| `gender`     | `Gender`             | Optional | Random selection from `GENDERS`                                   |
| `summary`    | `string`             | Yes      | Template-based: "{adjective} {archetype} who {background_clause}" |
| `appearance` | `string \| Physique` | Optional | Structured `Physique` from character appearance pools             |
| `body`       | `BodyMap`            | Optional | Skip for MVP; reuse character sensory pools later                 |

## Character Generator Reuse

Import directly from character pools via the `pools` namespace - no extraction to shared directory needed.

### Directly reusable

- **Name pools** (`../character/pools/names.ts`): `FEMALE_FIRST_NAMES`, `MALE_FIRST_NAMES`, `LAST_NAMES`
- **Appearance pools** (`../character/pools/appearance.ts`): heights, builds, skin tones, hair colors/styles/lengths, eye colors
- **Age generation**: Theme `ageRange` + `randomInt()` from shared utilities
- **Gender filters** (`../character/filters.ts`): body/appearance region filtering by gender
- **Sensory pools** (`../character/pools/sensory.ts`): scents, textures, visual descriptors (for future body map support)

### Shared infrastructure (already available)

- **Random utilities** (`../shared/random.ts`): `pickRandom`, `pickWeighted`, `pickFromPool`, `randomInt`, etc.
- **Type system** (`../../types.ts`): `WeightedValue`, `ValuePool`, `GenerationMode`, `GenerationMeta`

### Not reusable (character-specific)

- Personality pools - personas have no personality fields
- Backstory templates - personas use summary, not backstory
- Character themes - theme structure includes personality/details sections not applicable

## Generation Modes

1. **Full random**: Complete `PersonaProfile` from pools. "Generate Random Persona" button.
2. **Template-based**: Select an archetype that pre-fills fields thematically. User customizes after.
3. **Per-field**: "Randomize" button per field (name, age, appearance) in the builder form.

## Proposed Module Structure

```text
persona/
	AGENTS.md
	index.ts            (barrel exports)
	generate.ts         (main generation functions)
	types.ts            (PersonaTheme, PersonaGeneratorOptions, pool interfaces)
	pools/
		index.ts          (barrel)
		archetypes.ts     (archetype definitions with adjectives + backgrounds)
		summaries.ts      (summary template patterns)
	themes/
		index.ts          (theme registry)
		base.ts           (default persona theme - references character pools)
```

## Public API

### Types

```typescript
export interface PersonaBasicsPools {
  firstNames: ValuePool<string>;
  lastNames: ValuePool<string>;
  ageRange: [number, number];
  summaryTemplates: readonly string[];
}

export interface PersonaTheme {
  id: string;
  name: string;
  description: string;
  basics: PersonaBasicsPools;
}

export interface PersonaGeneratorOptions {
  theme?: string;
  gender?: Gender;
  archetype?: string;
  includeAppearance?: boolean;
  includeBody?: boolean;
  mode?: "fill-empty" | "overwrite-all";
  existing?: Partial<PersonaProfile>;
}

export interface PersonaGeneratorResult {
  profile: PersonaProfile;
  meta: GenerationMeta;
}
```

### Functions

```typescript
export function generatePersona(
  options?: PersonaGeneratorOptions,
): PersonaGeneratorResult;
export function generatePersonaName(gender?: Gender): string;
export function generatePersonaAge(range?: [number, number]): number;
export function generatePersonaSummary(archetype?: string): string;
export function generatePersonaAppearance(gender?: Gender): Physique;
```

## Archetype Templates

10 initial archetypes for summary generation. Pattern: "A {adjective} {archetype} who {background_clause}".

| Archetype              | Example Output                                                                |
| ---------------------- | ----------------------------------------------------------------------------- |
| Wandering Scholar      | "A curious scholar who left the academy to study ancient ruins firsthand"     |
| Battle-Scarred Veteran | "A weathered veteran who survived the northern campaigns and now seeks peace" |
| Street Urchin          | "A resourceful urchin who grew up in the market district's back alleys"       |
| Noble Heir             | "A restless noble who abandoned court life in search of adventure"            |
| Traveling Merchant     | "A shrewd merchant who trades exotic goods along the coastal routes"          |
| Hedge Mage             | "A self-taught mage who learned the craft from forbidden texts"               |
| Displaced Farmer       | "A sturdy farmer who lost their land and now works as a hired blade"          |
| Guild Artisan          | "A skilled artisan who crafts the finest leather goods in the region"         |
| Wilderness Guide       | "A seasoned guide who knows every trail through the eastern mountains"        |
| Disgraced Priest       | "A devout priest who was exiled for questioning the temple's authority"       |

Each archetype entry contains: `id`, `label`, `adjectives[]`, `backgroundClauses[]`, and optional `ageRange` override.

## Design Decisions

- **Pool sharing**: Import character pools directly rather than extracting to `src/shared/`. Extract only if a third domain needs the same pools.
- **Race field**: Not needed. `PersonaProfile` has no race field. Add race-aware pools later if the schema evolves.
- **Gender-first flow**: `generatePersona()` picks gender first (random if not specified), then uses it for gender-aware name selection.
- **UI integration**: Both builder form (per-field randomize) and library page (full generate button).
- **Body map**: Skip for MVP. Reuse character sensory pools when body map UI is implemented.

## Implementation Estimate

~300 lines of new code:

- ~100 lines: archetype definitions with adjective/background pools
- ~30 lines: summary template engine
- ~80 lines: `generatePersona()` main function
- ~40 lines: per-field convenience functions
- ~50 lines: theme definition and types

## Validation

- `CI=true pnpm --dir packages/generator run lint`
- `CI=true pnpm --dir packages/generator run typecheck`
- `CI=true pnpm --dir packages/generator run build`
- `CI=true pnpm --dir packages/generator run test`
