import { describe, expect, it, vi } from 'vitest';
import type { NarratorContext } from '@arcagentic/schemas';

vi.mock('@arcagentic/logger', () => ({
  createLogger: () => ({
    debug: (): void => undefined,
    warn: (): void => undefined,
    error: (): void => undefined,
  }),
}), { virtual: true });

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
    expect(prompt).toContain('Distinguish concrete NPC-provided detail from your own connective narration; embellishment may smooth the prose, but it must not replace or contradict explicit structured intent fields.');
    expect(prompt).toContain('Preserve concrete NPC-provided physical actions and observations when they are present instead of swapping them for vaguer alternatives.');
    expect(prompt).toContain('Treat sensory details supplied in NPC intents as privileged grounding for the scene, not optional garnish.');
    expect(prompt).toContain('Use internal state as subtext that shapes delivery, implication, and tone; do not automatically expose it as blunt omniscient exposition.');
    expect(prompt).toContain('When multiple NPCs respond, combine their beats into a single cohesive passage without losing which actor said or did what.');
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
    expect(prompt).toContain('- Selene');
    expect(prompt).toContain('  speech: "I told you I would."');
    expect(prompt).toContain('Compose the above into a vivid, descriptive prose passage of at least 40 words. Describe body language, expressions, and atmosphere - do not just repeat the dialogue.');
  });

  it('renders rich intent fields as labeled multi-line blocks', () => {
    const context: NarratorContext = {
      locationName: 'Dockside Tavern',
      presentActors: ['Mara'],
      recentHistory: [],
    };

    const prompt = buildNarratorUserPrompt(
      [
        {
          actorId: 'npc-2',
          name: 'Mara',
          dialogue: 'You came back.',
          physicalAction: 'closes her fingers around the cup without drinking',
          observation: 'notices the player keeps glancing at the door',
          sensoryDetail: 'lamp oil and wet wool cling to the room',
          emotion: 'wary but hopeful',
          internalState: 'trying not to show how relieved she is',
        },
      ],
      context,
    );

    expect(prompt).toContain('- Mara');
    expect(prompt).toContain('  speech: "You came back."');
    expect(prompt).toContain('  physical action: closes her fingers around the cup without drinking');
    expect(prompt).toContain('  observation: notices the player keeps glancing at the door');
    expect(prompt).toContain('  sensory detail: lamp oil and wet wool cling to the room');
    expect(prompt).toContain('  emotion: wary but hopeful');
    expect(prompt).toContain('  internal state: trying not to show how relieved she is');
  });

  it('falls back to the legacy action field when physicalAction is absent', () => {
    const context: NarratorContext = {
      locationName: 'Dockside Tavern',
      presentActors: ['Mara'],
      recentHistory: [],
    };

    const prompt = buildNarratorUserPrompt(
      [
        {
          actorId: 'npc-2',
          name: 'Mara',
          action: 'leans against the wall',
        },
      ],
      context,
    );

    expect(prompt).toContain('  physical action: leans against the wall');
  });
});

describe('composeNarrationFallback', () => {
  it('renders rich intent fields in a stable order without exposing internal state', () => {
    const intents: NpcIntent[] = [
      {
        actorId: 'npc-1',
        name: 'Selene',
        dialogue: 'Stay with me a little longer.',
        physicalAction: 'draws a slow breath and leans against the doorway',
        observation: 'notices how tense the room has gone',
        sensoryDetail: 'the curtains stir with the draft from the hall',
        emotion: 'a quiet longing',
        internalState: 'trying not to sound desperate',
        targetActorId: 'Avery',
      },
    ];

    const result = composeNarrationFallback(intents);

    expect(result.prose).toContain('*Action - Selene: draws a slow breath and leans against the doorway.*');
    expect(result.prose).toContain('*Observation - Selene: notices how tense the room has gone.*');
    expect(result.prose).toContain('*Sensory detail - Selene: the curtains stir with the draft from the hall.*');
    expect(result.prose).toContain('*Emotion - Selene: a quiet longing.*');
    expect(result.prose).toContain('"Stay with me a little longer." Selene says to Avery.');
    expect(result.prose).not.toContain('trying not to sound desperate');
    expect(result.source).toBe('fallback');
  });

  it('still formats legacy thin intents cleanly', () => {
    const result = composeNarrationFallback([
      {
        actorId: 'npc-2',
        name: 'Mara',
        dialogue: 'I missed you.',
        emotion: 'soft relief',
      },
    ]);

    expect(result.prose).toContain('*Emotion - Mara: soft relief.*');
    expect(result.prose).toContain('"I missed you." Mara says.');
  });

  it('uses legacy action when physicalAction is missing', () => {
    const result = composeNarrationFallback([
      {
        actorId: 'npc-3',
        name: 'Iris',
        action: 'folds her arms across her chest',
      },
    ]);

    expect(result.prose).toContain('*Action - Iris: folds her arms across her chest.*');
  });
});
