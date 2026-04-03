import type { PlayerInputClassification } from '@arcagentic/schemas';

export function classifyPlayerInput(input: string): PlayerInputClassification {
  const normalized = input.trim();
  if (normalized.length === 0) {
    return { mode: 'narration' };
  }

  const text = normalized.replace(/[\u201C\u201D]/g, '"');
  const speechParts: string[] = [];
  const narrationParts: string[] = [];

  let current = '';
  let inQuotes = false;

  for (const character of text) {
    if (character === '"') {
      const trimmed = current.trim();

      if (inQuotes) {
        if (trimmed) {
          speechParts.push(trimmed);
        }
      } else if (trimmed) {
        narrationParts.push(trimmed);
      }

      current = '';
      inQuotes = !inQuotes;
      continue;
    }

    current += character;
  }

  const remaining = current.trim();
  if (remaining) {
    if (inQuotes) {
      return { mode: 'narration', narrationContent: normalized };
    }

    narrationParts.push(remaining);
  }

  const speechContent = speechParts.join(' ') || undefined;
  const narrationContent = narrationParts.join(' ') || undefined;

  if (speechContent && narrationContent) {
    return { mode: 'mixed', speechContent, narrationContent };
  }

  if (speechContent) {
    return { mode: 'speech', speechContent };
  }

  return { mode: 'narration', narrationContent: narrationContent ?? normalized };
}
