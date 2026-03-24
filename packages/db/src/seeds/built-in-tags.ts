import { sql } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { promptTags } from '../schema/index.js';
import type { PgPoolLike } from '../types.js';
import type { BuiltInTag, BuiltInTagSeedMode, SeedBuiltInTagsOptions } from './types.js';

const STYLE_TAGS: BuiltInTag[] = [
  {
    name: 'Minimalist Prose',
    shortDescription: 'Short, declarative sentences without purple prose',
    category: 'style',
    promptText: 'Use short, declarative sentences. Avoid purple prose. Let actions speak.',
  },
  {
    name: 'Evocative Description',
    shortDescription: 'Vivid sensory writing with metaphor and simile',
    category: 'style',
    promptText: 'Paint vivid sensory pictures. Use metaphor and simile. Engage all senses.',
  },
  {
    name: 'Dialogue Heavy',
    shortDescription: 'Favor dialogue over narration',
    category: 'style',
    promptText:
      'Favor dialogue over narration. Show character through speech. Minimize exposition.',
  },
  {
    name: 'Internal Monologue',
    shortDescription: 'Include character thoughts and internal reactions',
    category: 'style',
    promptText:
      'Include character thoughts and internal reactions. Show motivation through reflection.',
  },
];

const MECHANIC_TAGS: BuiltInTag[] = [
  {
    name: 'Roll-Based Outcomes',
    shortDescription: 'Use dice rolls to determine uncertain outcomes',
    category: 'mechanic',
    promptText:
      'When uncertainty exists, roll dice. State the roll and interpret results. Format: [Roll: 2d6 → result]',
  },
  {
    name: 'Skill Checks',
    shortDescription: 'Reference character skills for difficult actions',
    category: 'mechanic',
    promptText:
      'When characters attempt difficult actions, reference their skills. Describe how competence affects outcomes.',
  },
  {
    name: 'Resource Tracking',
    shortDescription: 'Track consumable items and inventory',
    category: 'mechanic',
    promptText:
      'Track consumable resources. Note when items are used or depleted. Mention inventory constraints.',
  },
];

const CONTENT_TAGS: BuiltInTag[] = [
  {
    name: 'Fade to Black',
    shortDescription: 'Intimate scenes fade to black with time skip',
    category: 'content',
    promptText:
      'Intimate scenes fade to black. Suggest rather than describe. Resume after time skip.',
  },
  {
    name: 'Graphic Violence',
    shortDescription: 'Visceral, detailed combat descriptions',
    category: 'content',
    promptText: 'Combat is visceral and detailed. Describe injuries, blood, and consequences.',
  },
  {
    name: 'Family Friendly',
    shortDescription: 'Keep content appropriate for all ages',
    category: 'content',
    promptText: 'Keep content appropriate for all ages. No explicit violence, language, or themes.',
  },
];

const WORLD_TAGS: BuiltInTag[] = [
  {
    name: 'Verbal Magic',
    shortDescription: 'Magic requires spoken incantations',
    category: 'world',
    promptText:
      'Magic requires spoken incantations. Mages must speak to cast. Silence blocks spellcasting.',
  },
  {
    name: 'Technology Grounded',
    shortDescription: 'Technology follows real-world physics',
    category: 'world',
    promptText: 'Technology follows real-world physics. No handwaving. Explain how devices work.',
  },
  {
    name: 'Consequences Matter',
    shortDescription: 'Actions have lasting consequences',
    category: 'world',
    promptText:
      'Actions have lasting consequences. NPCs remember. The world reacts to player choices.',
  },
];

const ALL_BUILT_IN_TAGS: BuiltInTag[] = [
  ...STYLE_TAGS,
  ...MECHANIC_TAGS,
  ...CONTENT_TAGS,
  ...WORLD_TAGS,
];

/**
 * Seeds the database with built-in tags.
 * By default this is non-destructive (insert-only) to avoid overwriting edits made
 * in dev via the UI. Use `mode: 'upsert'` when you intentionally want the code
 * definitions to refresh existing built-in tags.
 */
export async function seedBuiltInTags(
  _pool: PgPoolLike,
  options: SeedBuiltInTagsOptions = {}
): Promise<void> {
  void _pool;
  console.info('[seed] Seeding built-in tags...');

  const mode: BuiltInTagSeedMode = options.mode ?? 'insert';
  const tagValues = ALL_BUILT_IN_TAGS.map((tag) => ({
    name: tag.name,
    description: tag.shortDescription,
    category: tag.category,
    promptText: tag.promptText,
    isActive: true,
  }));

  if (mode === 'upsert') {
    await db
      .insert(promptTags)
      .values(tagValues)
      .onConflictDoUpdate({
        target: promptTags.name,
        set: {
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          promptText: sql`excluded.prompt_text`,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  } else {
    await db.insert(promptTags).values(tagValues).onConflictDoNothing({ target: promptTags.name });
  }

  console.info(`[seed] Seeded ${ALL_BUILT_IN_TAGS.length} built-in tags.`);
}
