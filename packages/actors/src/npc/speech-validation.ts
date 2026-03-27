import type { SpeechStyle } from '@arcagentic/schemas';

export interface SpeechValidationResult {
  passed: boolean;
  warnings: string[];
}

const FORMAL_MARKERS = /\b(?:therefore|henceforth|indeed|furthermore|moreover)\b/i;
const HUMOR_MARKERS = /\b(?:haha|lol|heh|laugh(?:ing|ed|s)?)\b/i;

function normalizeWord(word: string): string {
  return word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
}

function getWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => normalizeWord(word))
    .filter((word) => word.length > 0);
}

function getAverageWordLength(text: string): number {
  const words = getWords(text);
  if (words.length === 0) {
    return 0;
  }

  const totalLength = words.reduce((sum, word) => sum + word.length, 0);
  return totalLength / words.length;
}

function getAverageSentenceLength(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length === 0) {
    return 0;
  }

  const totalWords = sentences.reduce((sum, sentence) => sum + getWords(sentence).length, 0);
  return totalWords / sentences.length;
}

/**
 * Apply soft heuristics to check whether generated dialogue matches a configured speech style.
 */
export function validateSpeechStyle(
  output: string,
  speech: SpeechStyle,
): SpeechValidationResult {
  const warnings: string[] = [];

  if ((speech.vocabulary ?? 'average') === 'simple' && getAverageWordLength(output) > 7) {
    warnings.push('Output may use overly complex vocabulary for simple speech style');
  }

  if (
    (speech.sentenceStructure ?? 'moderate') === 'terse' &&
    getAverageSentenceLength(output) > 10
  ) {
    warnings.push('Output may be too verbose for terse speech style');
  }

  if ((speech.formality ?? 'neutral') === 'casual' && FORMAL_MARKERS.test(output)) {
    warnings.push('Output contains formal markers inconsistent with casual style');
  }

  if ((speech.humor ?? 'occasional') === 'none' && HUMOR_MARKERS.test(output)) {
    warnings.push('Output contains humor markers despite none humor setting');
  }

  return {
    passed: warnings.length === 0,
    warnings,
  };
}