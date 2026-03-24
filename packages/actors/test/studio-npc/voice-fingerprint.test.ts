import { describe, expect, it } from 'vitest';

import { VoiceFingerprintAnalyzer } from '../../src/studio-npc/voice-fingerprint.js';
import type { ConversationMessage } from '../../src/studio-npc/types.js';

function createMessage(
  id: string,
  content: string,
  role: ConversationMessage['role'] = 'character'
): ConversationMessage {
  return {
    id,
    role,
    content,
    timestamp: new Date('2025-01-01T00:00:00Z'),
  };
}

describe('VoiceFingerprintAnalyzer', () => {
  const analyzer = new VoiceFingerprintAnalyzer();

  it('returns a voice fingerprint structure for larger character message sets', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'By the moon we travel together.'),
      createMessage('2', 'By the moon we remember our oath.'),
      createMessage('3', 'By the moon we rest in silence.'),
      createMessage('4', 'The lantern light keeps watch tonight.'),
      createMessage('5', 'The lantern light knows our names.'),
    ]);

    expect(fingerprint).toEqual({
      vocabulary: expect.any(Object),
      rhythm: expect.any(Object),
      patterns: expect.any(Object),
      humor: expect.any(Object),
    });
  });

  it('classifies short-word speech as simple vocabulary', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'We run fast and stay low.'),
      createMessage('2', 'You stay calm and move now.'),
      createMessage('3', 'We keep watch by the gate.'),
      createMessage('4', 'No one gets past us now.'),
      createMessage('5', 'We act quick and stay sharp.'),
    ]);

    expect(fingerprint.vocabulary.level).toBe('simple');
  });

  it('classifies long-word speech as erudite vocabulary', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'Extraordinary luminescence illuminates every contemplation.'),
      createMessage('2', 'Metamorphosis and introspection anchor my observations.'),
      createMessage('3', 'Philosophical inclinations encourage deliberate articulation.'),
      createMessage('4', 'Perspicacious analysis rewards patience and discernment.'),
      createMessage('5', 'Magnanimous reverberations accompany profound reflection.'),
    ]);

    expect(fingerprint.vocabulary.level).toBe('erudite');
  });

  it('detects distinctive words that appear across multiple messages', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'The lantern guides me home.'),
      createMessage('2', 'That lantern has seen too much.'),
      createMessage('3', 'I trust the lantern more than dawn.'),
      createMessage('4', 'Dark roads still remember our steps.'),
      createMessage('5', 'Night winds keep the lantern steady.'),
    ]);

    expect(fingerprint.vocabulary.distinctiveWords).toContain('lantern');
  });

  it('marks steady sentence lengths as consistent rhythm', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'One two three four.'),
      createMessage('2', 'Five six seven eight.'),
      createMessage('3', 'Nine ten eleven twelve.'),
      createMessage('4', 'Thirteen fourteen fifteen sixteen.'),
      createMessage('5', 'Seventeen eighteen nineteen twenty.'),
    ]);

    expect(fingerprint.rhythm.variability).toBe('consistent');
  });

  it('marks highly varied sentence lengths as erratic rhythm', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'Hi.'),
      createMessage('2', 'Go.'),
      createMessage('3', 'Run.'),
      createMessage(
        '4',
        'This extremely elaborate explanation stretches onward with many additional descriptive words, pauses, and observations so that the sentence becomes undeniably long for contrast.'
      ),
      createMessage(
        '5',
        'Another dramatically extended reflection keeps layering clauses, images, and qualifications until it becomes unmistakably verbose and far longer than the clipped replies above.'
      ),
    ]);

    expect(fingerprint.rhythm.variability).toBe('erratic');
  });

  it('detects repeated signature phrases', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'By the moon we travel.'),
      createMessage('2', 'By the moon we wait.'),
      createMessage('3', 'By the moon we return.'),
      createMessage('4', 'A quiet oath binds us.'),
      createMessage('5', 'No dawn erases that oath.'),
    ]);

    expect(fingerprint.patterns.signaturePhrases).toContain('by the moon');
  });

  it('detects occasional humor when humor indicators are present', () => {
    const fingerprint = analyzer.analyze([
      createMessage('1', 'Haha, you finally noticed.'),
      createMessage('2', 'I am kidding, mostly.'),
      createMessage('3', 'That joke landed better than expected.'),
      createMessage('4', 'Still, I mean every warning.'),
      createMessage('5', 'Stay close and keep your head down.'),
    ]);

    expect(fingerprint.humor.frequency).toBe('occasional');
  });

  it('returns sensible defaults for an empty message array', () => {
    expect(analyzer.analyze([])).toEqual({
      vocabulary: { level: 'average', distinctiveWords: [] },
      rhythm: { averageSentenceLength: 10, variability: 'varied' },
      patterns: { signaturePhrases: [], avoidedTopics: [], emotionalTriggers: [] },
      humor: { frequency: 'none', type: null },
    });
  });

  it('returns defaults when there is only a single character message', () => {
    expect(analyzer.analyze([createMessage('1', 'Hello there.')])).toEqual({
      vocabulary: { level: 'average', distinctiveWords: [] },
      rhythm: { averageSentenceLength: 10, variability: 'varied' },
      patterns: { signaturePhrases: [], avoidedTopics: [], emotionalTriggers: [] },
      humor: { frequency: 'none', type: null },
    });
  });
});
