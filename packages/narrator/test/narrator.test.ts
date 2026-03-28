import { describe, expect, it } from 'vitest';
import type { NarratorContext } from '@arcagentic/schemas';
import { buildNarratorSystemPrompt, buildNarratorUserPrompt, composeNarrationFallback } from '../src/narrator.js';
import { DEFAULT_NARRATION_CONFIG, type NpcIntent } from '../src/types.js';

describe('buildNarratorSystemPrompt', () => {
  it('requires rich descriptive prose around dialogue-only intents', () => {
    const prompt = buildNarratorSystemPrompt(DEFAULT_NARRATION_CONFIG);

    expect(prompt).toContain('Write like a scene from a novel, not a chat log or transcript.');
    expect(prompt).toContain('CRITICAL: Your output must ALWAYS be a descriptive prose passage of at least 40 words. NEVER return just a line of dialogue.');
    expect(prompt).toContain('Bare dialogue output is NEVER acceptable.');
    expect(prompt).toContain('Always describe the NPC\'s body language, expressions, posture, physical presence, and manner of speaking, even when only dialogue is provided.');
    expect(prompt).toContain('If the NPC intent is only dialogue, you MUST describe how the character delivers the line: their posture, expression, tone of voice, where their eyes go, and the atmosphere of the space around them.');
    expect(prompt).toContain('Even if an NPC intent contains only dialogue with no action or emotion, you MUST add descriptive prose around the dialogue showing body language, tone of voice, facial expressions, and scene atmosphere.');
    expect(prompt).toContain('Keep the passage under 200 words, but never drop below 40 words.');
    expect(prompt).toContain('When a scene description is provided, use it to ground the NPC\'s response in their environment and current activity.');
    expect(prompt).toContain('Actively layer in sensory atmosphere such as sounds, lighting, texture, temperature, and environmental feel when they support the moment.');
  });
});

describe('buildNarratorUserPrompt', () => {
  it('includes player name and description in scene context', () => {
    const context: NarratorContext = {
      locationName: 'Moonlit Conservatory',
      sceneDescription: 'Glass walls hold the night close.',
      presentActors: ['Selene'],
      recentHistory: ['A hush settled over the orchids.'],
      playerName: 'Avery',
      playerDescription: 'Avery stands near the fountain, still damp from the rain.',
      playerMessage: 'You came back.',
      sceneEvents: ['Rain taps softly against the glass.'],
    };

    const prompt = buildNarratorUserPrompt(
      [
        {
          actorId: 'npc-1',
          name: 'Selene',
          dialogue: 'I told you I would.',
        },
      ],
      context,
    );

    expect(prompt).toContain('Current scene/situation: Glass walls hold the night close.');
    expect(prompt).toContain('Ground the NPC\'s response in this scene context.');
    expect(prompt).toContain('The player character is Avery.');
    expect(prompt).toContain('Player description: Avery stands near the fountain, still damp from the rain.');
    expect(prompt).toContain('Avery said: "You came back."');
    expect(prompt).toContain('Compose the above into a vivid, descriptive prose passage of at least 40 words. Describe body language, expressions, and atmosphere - do not just repeat the dialogue.');
  });
});

describe('composeNarrationFallback', () => {
  it('wraps dialogue with action and emotion when available', () => {
    const intents: NpcIntent[] = [
      {
        actorId: 'npc-1',
        name: 'Selene',
        dialogue: 'Stay with me a little longer.',
        action: 'draws a slow breath and leans against the doorway',
        emotion: 'a quiet longing',
        targetActorId: 'Avery',
      },
    ];

    const result = composeNarrationFallback(intents);

    expect(result.prose).toContain('*Selene draws a slow breath and leans against the doorway.*');
    expect(result.prose).toContain("*Selene's expression carries a quiet longing through the moment.*");
    expect(result.prose).toContain('"Stay with me a little longer." Selene says to Avery.');
    expect(result.source).toBe('fallback');
  });

  it('still formats emotion-only intents cleanly', () => {
    const result = composeNarrationFallback([
      {
        actorId: 'npc-2',
        name: 'Mara',
        dialogue: 'I missed you.',
        emotion: 'soft relief',
      },
    ]);

    expect(result.prose).toContain("*Mara's expression shifts, soft relief evident in every line.*");
    expect(result.prose).toContain('"I missed you." Mara says.');
  });
});
