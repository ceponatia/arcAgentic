/**
 * Narrow an unknown value to a plain record.
 *
 * Arrays are intentionally excluded because downstream callers use this helper
 * for object payload/state access, not indexed collections.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}