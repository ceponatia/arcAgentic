import { describe, expect, it } from 'vitest';

import { classifyPlayerInput } from '../../src/game/classify-input.js';

describe('classifyPlayerInput', () => {
  it('classifies pure speech', () => {
    expect(classifyPlayerInput('"Hello there"')).toEqual({
      mode: 'speech',
      speechContent: 'Hello there',
    });
  });

  it('classifies pure narration', () => {
    expect(classifyPlayerInput('She walks through the door')).toEqual({
      mode: 'narration',
      narrationContent: 'She walks through the door',
    });
  });

  it('classifies mixed input', () => {
    expect(classifyPlayerInput('She looks over and says "Hi there" with a smile')).toEqual({
      mode: 'mixed',
      speechContent: 'Hi there',
      narrationContent: 'She looks over and says with a smile',
    });
  });

  it('classifies multiple quoted segments', () => {
    expect(classifyPlayerInput('"Hello" she said "How are you?"')).toEqual({
      mode: 'mixed',
      speechContent: 'Hello How are you?',
      narrationContent: 'she said',
    });
  });

  it('treats curly quotes as speech delimiters', () => {
    expect(classifyPlayerInput('\u201CHello\u201D')).toEqual({
      mode: 'speech',
      speechContent: 'Hello',
    });
  });

  it('classifies mixed curly quote input', () => {
    expect(classifyPlayerInput('She says \u201CHello\u201D warmly')).toEqual({
      mode: 'mixed',
      speechContent: 'Hello',
      narrationContent: 'She says warmly',
    });
  });

  it('falls back to narration for unbalanced quotes', () => {
    expect(classifyPlayerInput('"Hello')).toEqual({
      mode: 'narration',
      narrationContent: '"Hello',
    });
  });

  it('treats empty input as narration', () => {
    expect(classifyPlayerInput('   ')).toEqual({
      mode: 'narration',
    });
  });

  it('treats whitespace-only quoted content as narration', () => {
    expect(classifyPlayerInput('"  "').mode).toBe('narration');
  });

  it('treats empty quoted content as narration', () => {
    expect(classifyPlayerInput('""').mode).toBe('narration');
  });
});
