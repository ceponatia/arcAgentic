import { Effect } from 'effect';
import { buildCharacterProfile } from '../../../../config/vitest/builders/character-profile.js';
import { expandNpcProfile } from '../../src/npc/expansion.js';

describe('expandNpcProfile', () => {
  it('falls back to the existing profile when no cognition router is provided', async () => {
    const existingProfile = buildCharacterProfile({
      tier: 'background',
      name: 'Mara',
      race: 'Human',
      gender: 'female',
      personality: ['guarded'],
    });

    const result = await expandNpcProfile({
      existingProfile,
      targetTier: 'minor',
      interactionSummary: ['The player kept asking Mara about the old harbor watch.'],
    });

    expect(result.profile.name).toBe('Mara');
    expect(result.profile.tier).toBe('minor');
    expect(result.meta.usedFallback).toBe(true);
  });

  it('merges expanded fields while preserving identity anchors', async () => {
    const execute = vi.fn().mockReturnValue(
      Effect.succeed({
        id: 'llm-response-001',
        content: JSON.stringify({
          name: 'Renamed by model',
          backstory: 'She once mapped the harbor tunnels for smugglers before turning informant.',
          personalityTraits: ['observant', 'patient', 'secretive'],
          speechPatterns: 'Speaks in clipped, careful phrases and avoids direct promises.',
          scheduleTemplate: ['Dawn patrol at the docks', 'Night circuit through the alleys'],
        }),
        tool_calls: null,
        usage: null,
      }),
    );

    const existingProfile = buildCharacterProfile({
      tier: 'background',
      name: 'Mara',
      race: 'Human',
      gender: 'female',
      personality: ['guarded'],
      backstory: 'Mara keeps the harbor ledger and notices more than she says.',
      details: [
        {
          label: 'Known for',
          value: 'Keeps meticulous notes.',
          area: 'history',
          importance: 0.6,
          tags: ['existing'],
        },
      ],
    });

    const result = await expandNpcProfile(
      {
        existingProfile,
        targetTier: 'minor',
        interactionSummary: [
          'The player returned twice to ask Mara about missing cargo.',
          'Mara opened up after the player shared evidence about the smugglers.',
        ],
      },
      {
        cognitionRouter: {
          execute,
        } as never,
      },
    );

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'deep',
      }),
    );
    expect(result.profile.name).toBe('Mara');
    expect(result.profile.race).toBe('Human');
    expect(result.profile.gender).toBe('female');
    expect(result.profile.tier).toBe('minor');
    expect(result.profile.personality).toEqual(
      expect.arrayContaining(['guarded', 'observant', 'patient', 'secretive']),
    );
    expect(result.profile.backstory).toContain(
      'Mara keeps the harbor ledger and notices more than she says.',
    );
    expect(result.profile.backstory).toContain('mapped the harbor tunnels');
    expect(result.profile.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: expect.stringContaining('Schedule: Dawn patrol at the docks') }),
        expect.objectContaining({ value: expect.stringContaining('Speech pattern: Speaks in clipped, careful phrases') }),
      ]),
    );
    expect(result.meta.usedFallback).toBe(false);
  });
});
