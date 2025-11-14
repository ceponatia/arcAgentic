# @minimal-rpg/shared

Shared utilities and types for Minimal RPG.

Exports

- `CharacterProfileSchema`, `SettingProfileSchema`: Zod schemas used at runtime for validation.
- `CharacterProfile`, `SettingProfile`: inferred TypeScript types for convenience.

Notes

- Character profiles support optional `style` hints to shape narration:
  - `sentenceLength`: `terse` | `balanced` | `long`
  - `humor`: `none` | `light` | `wry` | `dark`
  - `darkness`: `low` | `medium` | `high`
  - `pacing`: `slow` | `balanced` | `fast`
  - `formality`: `casual` | `neutral` | `formal`
  - `verbosity`: `terse` | `balanced` | `lavish`
