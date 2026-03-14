/**
 * Clamp a number between min and max.
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
