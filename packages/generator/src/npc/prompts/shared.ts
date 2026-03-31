import type { CharacterProfile, NpcGenerationContext } from '@arcagentic/schemas';

type NpcSeedIdentity = Pick<CharacterProfile, 'name' | 'age' | 'gender' | 'race'>;

function formatJsonBlock(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatExistingNpcs(context: NpcGenerationContext): string | undefined {
  if (!context.existingNpcs?.length) {
    return undefined;
  }

  return context.existingNpcs
    .map((npc) => {
      const parts = [npc.name, npc.race, npc.gender, npc.occupation, npc.tier].filter(Boolean);
      return `- ${parts.join(' | ')}`;
    })
    .join('\n');
}

export function buildContextSummary(context: NpcGenerationContext): string {
  const sections: string[] = [];

  if (context.setting) {
    sections.push(
      [
        'Setting:',
        `- Era: ${context.setting.era}`,
        `- Tone: ${context.setting.tone}`,
        `- Themes: ${context.setting.themes.join(', ') || 'none'}`,
      ].join('\n')
    );
  }

  if (context.location) {
    sections.push(
      [
        'Location:',
        `- Name: ${context.location.name}`,
        `- Type: ${context.location.type}`,
        `- Description: ${context.location.description}`,
        `- Tags: ${context.location.tags.join(', ') || 'none'}`,
      ].join('\n')
    );
  }

  const existingNpcs = formatExistingNpcs(context);
  if (existingNpcs) {
    sections.push(`Existing NPCs to stay distinct from:\n${existingNpcs}`);
  }

  if (context.player) {
    sections.push(
      [
        'Player context:',
        context.player.level ? `- Level: ${context.player.level}` : undefined,
        context.player.currentQuests?.length
          ? `- Current quests: ${context.player.currentQuests.join(', ')}`
          : undefined,
        context.player.recentInteractions?.length
          ? `- Recent interactions: ${context.player.recentInteractions.join(', ')}`
          : undefined,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  if (context.archetype) {
    sections.push(`Archetype hint:\n- ${context.archetype}`);
  }

  if (context.nameOverride) {
    sections.push(`Required name override:\n- ${context.nameOverride}`);
  }

  return sections.join('\n\n') || 'No additional world context was provided.';
}

export function buildSeedIdentitySummary(seedIdentity: NpcSeedIdentity): string {
  return formatJsonBlock(seedIdentity);
}

export function buildDraftSummary(draft: CharacterProfile): string {
  return formatJsonBlock({
    name: draft.name,
    age: draft.age,
    gender: draft.gender,
    race: draft.race,
    summary: draft.summary,
    occupation: draft.occupation,
    personality: draft.personality,
    details: draft.details?.slice(0, 4).map((detail) => detail.value),
  });
}
