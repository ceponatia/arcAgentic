import {
  NpcAgentIntentSchema,
  NpcNarrationIntentSchema,
  SpeakIntentSchema,
  SpokeEffectSchema,
} from '@arcagentic/schemas';

describe('Narration and event boundary schemas', () => {
  it('accepts the expanded NPC agent intent shape', () => {
    const result = NpcAgentIntentSchema.parse({
      actorId: 'npc-001',
      name: 'Iris',
      dialogue: 'Stay close.',
      physicalAction: 'steps between the player and the doorway',
      observation: 'the torchlight flickers against the wet stone',
      internalState: 'quietly assessing the risk',
      sensoryDetail: 'rainwater drips somewhere deeper in the hall',
      emotion: 'tense',
      targetActorId: 'player-001',
    });

    expect(result).toMatchObject({
      actorId: 'npc-001',
      name: 'Iris',
      dialogue: 'Stay close.',
      physicalAction: 'steps between the player and the doorway',
      observation: 'the torchlight flickers against the wet stone',
      internalState: 'quietly assessing the risk',
      sensoryDetail: 'rainwater drips somewhere deeper in the hall',
      emotion: 'tense',
      targetActorId: 'player-001',
    });
  });

  it('keeps the legacy narration alias and deprecated action field working', () => {
    const result = NpcNarrationIntentSchema.parse({
      actorId: 'npc-001',
      name: 'Iris',
      action: 'leans closer',
    });

    expect(result).toMatchObject({
      actorId: 'npc-001',
      name: 'Iris',
      action: 'leans closer',
    });
  });

  it('accepts expanded speak intent fields alongside legacy action', () => {
    const result = SpeakIntentSchema.parse({
      type: 'SPEAK_INTENT',
      sessionId: 'session-001',
      actorId: 'npc-001',
      content: 'Listen.',
      action: 'raises a hand',
      physicalAction: 'takes a half-step forward',
      observation: 'the wind has gone still',
      internalState: 'trying not to show concern',
      sensoryDetail: 'the room smells faintly of smoke',
      emotion: 'guarded',
    });

    expect(result).toMatchObject({
      type: 'SPEAK_INTENT',
      content: 'Listen.',
      action: 'raises a hand',
      physicalAction: 'takes a half-step forward',
      observation: 'the wind has gone still',
      internalState: 'trying not to show concern',
      sensoryDetail: 'the room smells faintly of smoke',
      emotion: 'guarded',
    });
  });

  it('accepts expanded spoke effect fields alongside legacy action', () => {
    const result = SpokeEffectSchema.parse({
      type: 'SPOKE',
      sessionId: 'session-001',
      actorId: 'npc-001',
      content: 'We move now.',
      action: 'glances toward the exit',
      physicalAction: 'turns toward the stairwell',
      observation: 'shadows are shifting by the far wall',
      internalState: 'pushing down a spike of panic',
      sensoryDetail: 'boots scrape softly across grit',
      emotion: 'urgent',
    });

    expect(result).toMatchObject({
      type: 'SPOKE',
      content: 'We move now.',
      action: 'glances toward the exit',
      physicalAction: 'turns toward the stairwell',
      observation: 'shadows are shifting by the far wall',
      internalState: 'pushing down a spike of panic',
      sensoryDetail: 'boots scrape softly across grit',
      emotion: 'urgent',
    });
  });
});
