import {
  PlayerInputClassificationSchema,
  SpeakIntentSchema,
  SpokeEffectSchema,
  WireEffectSchema,
  WireIntentSchema,
} from '@arcagentic/schemas';
import { describe, expect, it } from 'vitest';

describe('Player input classification event schemas', () => {
  it('keeps SPOKE backward compatible without classification fields', () => {
    const result = SpokeEffectSchema.parse({
      type: 'SPOKE',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: 'Hello there',
      timestamp: new Date('2026-04-01T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      type: 'SPOKE',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: 'Hello there',
    });
  });

  it('accepts SPOKE events with classification fields', () => {
    const result = SpokeEffectSchema.parse({
      type: 'SPOKE',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: '"Hello" she waves',
      inputMode: 'mixed',
      speechContent: 'Hello',
      narrationContent: 'she waves',
      timestamp: new Date('2026-04-01T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      type: 'SPOKE',
      inputMode: 'mixed',
      speechContent: 'Hello',
      narrationContent: 'she waves',
    });
  });

  it('keeps SPEAK_INTENT backward compatible without classification fields', () => {
    const result = SpeakIntentSchema.parse({
      type: 'SPEAK_INTENT',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: 'Look out',
      timestamp: new Date('2026-04-01T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      type: 'SPEAK_INTENT',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: 'Look out',
    });
  });

  it('accepts SPEAK_INTENT events with classification fields', () => {
    const result = SpeakIntentSchema.parse({
      type: 'SPEAK_INTENT',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: 'She winces. "That hurts."',
      inputMode: 'mixed',
      speechContent: 'That hurts.',
      narrationContent: 'She winces.',
      timestamp: new Date('2026-04-01T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      type: 'SPEAK_INTENT',
      inputMode: 'mixed',
      speechContent: 'That hurts.',
      narrationContent: 'She winces.',
    });
  });

  it('validates player input classification shapes and rejects invalid modes', () => {
    const parsed = PlayerInputClassificationSchema.parse({
      mode: 'speech',
      speechContent: 'Hello there',
    });

    expect(parsed).toEqual({
      mode: 'speech',
      speechContent: 'Hello there',
    });

    const invalid = PlayerInputClassificationSchema.safeParse({
      mode: 'monologue',
      speechContent: 'Hello there',
    });

    expect(invalid.success).toBe(false);
  });

  it('accepts classification fields in wire effect and intent schemas', () => {
    const wireEffect = WireEffectSchema.parse({
      type: 'SPOKE',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: '"Hello" she nods',
      inputMode: 'mixed',
      speechContent: 'Hello',
      narrationContent: 'she nods',
      timestamp: '2026-04-01T12:00:00.000Z',
    });

    const wireIntent = WireIntentSchema.parse({
      type: 'SPEAK_INTENT',
      sessionId: 'session-001',
      actorId: 'player-001',
      content: 'He mutters "Fine."',
      inputMode: 'mixed',
      speechContent: 'Fine.',
      narrationContent: 'He mutters',
      timestamp: '2026-04-01T12:00:00.000Z',
    });

    expect(wireEffect).toMatchObject({
      inputMode: 'mixed',
      speechContent: 'Hello',
      narrationContent: 'she nods',
    });
    expect(wireEffect.timestamp).toBeInstanceOf(Date);

    expect(wireIntent).toMatchObject({
      inputMode: 'mixed',
      speechContent: 'Fine.',
      narrationContent: 'He mutters',
    });
    expect(wireIntent.timestamp).toBeInstanceOf(Date);
  });
});