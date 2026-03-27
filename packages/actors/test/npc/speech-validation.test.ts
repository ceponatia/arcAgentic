import { describe, expect, it } from 'vitest';
import type { SpeechStyle } from '@arcagentic/schemas';

import { validateSpeechStyle } from '../../src/npc/speech-validation.js';

const DEFAULT_SPEECH_STYLE: SpeechStyle = {
  vocabulary: 'average',
  sentenceStructure: 'moderate',
  formality: 'neutral',
  humor: 'occasional',
  expressiveness: 'moderate',
  directness: 'direct',
  pace: 'moderate',
};

describe('validateSpeechStyle', () => {
  it('produces no warnings for all-default speech style', () => {
    expect(validateSpeechStyle('We should head back before sunset.', DEFAULT_SPEECH_STYLE)).toEqual({
      passed: true,
      warnings: [],
    });
  });

  it('triggers a warning for complex output with simple vocabulary', () => {
    const result = validateSpeechStyle(
      'Extraordinary formulations demonstrate intellectual sophistication.',
      {
        ...DEFAULT_SPEECH_STYLE,
        vocabulary: 'simple',
      }
    );

    expect(result.warnings).toContain(
      'Output may use overly complex vocabulary for simple speech style'
    );
  });

  it('does not trigger a vocabulary warning for simple output', () => {
    const result = validateSpeechStyle('I will help you now.', {
      ...DEFAULT_SPEECH_STYLE,
      vocabulary: 'simple',
    });

    expect(result.warnings).not.toContain(
      'Output may use overly complex vocabulary for simple speech style'
    );
  });

  it('triggers a warning for long sentences with terse structure', () => {
    const result = validateSpeechStyle(
      'I will explain the entire situation in exhaustive detail because every single part of it matters to me right now.',
      {
        ...DEFAULT_SPEECH_STYLE,
        sentenceStructure: 'terse',
      }
    );

    expect(result.warnings).toContain('Output may be too verbose for terse speech style');
  });

  it('does not trigger a sentence-length warning for short sentences', () => {
    const result = validateSpeechStyle('Wait. Stay back.', {
      ...DEFAULT_SPEECH_STYLE,
      sentenceStructure: 'terse',
    });

    expect(result.warnings).not.toContain(
      'Output may be too verbose for terse speech style'
    );
  });

  it('triggers a warning for formal markers in casual speech', () => {
    const result = validateSpeechStyle('Therefore, we should leave now.', {
      ...DEFAULT_SPEECH_STYLE,
      formality: 'casual',
    });

    expect(result.warnings).toContain(
      'Output contains formal markers inconsistent with casual style'
    );
  });

  it('does not trigger a formality warning for casual text', () => {
    const result = validateSpeechStyle("We're heading out now, okay?", {
      ...DEFAULT_SPEECH_STYLE,
      formality: 'casual',
    });

    expect(result.warnings).not.toContain(
      'Output contains formal markers inconsistent with casual style'
    );
  });

  it('triggers a warning for humor markers when humor is none', () => {
    const result = validateSpeechStyle('Haha, that was close.', {
      ...DEFAULT_SPEECH_STYLE,
      humor: 'none',
    });

    expect(result.warnings).toContain(
      'Output contains humor markers despite none humor setting'
    );
  });

  it('does not trigger a humor warning for serious text', () => {
    const result = validateSpeechStyle('This matter is serious.', {
      ...DEFAULT_SPEECH_STYLE,
      humor: 'none',
    });

    expect(result.warnings).not.toContain(
      'Output contains humor markers despite none humor setting'
    );
  });

  it('can return multiple warnings at once', () => {
    const result = validateSpeechStyle(
      'Therefore, haha, I shall articulate extraordinarily elaborate terminology while laughing about every absurd complication in this situation.',
      {
        ...DEFAULT_SPEECH_STYLE,
        vocabulary: 'simple',
        sentenceStructure: 'terse',
        formality: 'casual',
        humor: 'none',
      }
    );

    expect(result).toEqual({
      passed: false,
      warnings: [
        'Output may use overly complex vocabulary for simple speech style',
        'Output may be too verbose for terse speech style',
        'Output contains formal markers inconsistent with casual style',
        'Output contains humor markers despite none humor setting',
      ],
    });
  });
});