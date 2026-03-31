export interface ImportanceSignals {
  hasDirectPlayerInteraction: boolean;
  hasObservation: boolean;
  hasSensoryDetail: boolean;
  hasEmotionOrInternalState: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Compute a bounded episodic importance score from narrative signals.
 */
export function computeEpisodicImportance(signals: ImportanceSignals): number {
  let importance = 0.4;

  if (signals.hasDirectPlayerInteraction) {
    importance += 0.2;
  }

  if (signals.hasObservation) {
    importance += 0.1;
  }

  if (signals.hasSensoryDetail) {
    importance += 0.1;
  }

  if (signals.hasEmotionOrInternalState) {
    importance += 0.1;
  }

  return clamp(importance, 0.3, 0.95);
}

/**
 * Map episodic importance to a simple memory decay rate.
 */
export function computeEpisodicDecayRate(importance: number): number {
  const boundedImportance = clamp(importance, 0.3, 0.95);

  if (boundedImportance >= 0.7) {
    return 0.005;
  }

  if (boundedImportance >= 0.5) {
    return 0.01;
  }

  return 0.03;
}
