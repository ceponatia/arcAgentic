import type { ZodSchema } from 'zod';
/**
 * Safely parse JSON with typed fallback.
 * @param text - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed value or fallback
 */
export declare function safeParseJson<T>(text: string | null | undefined, fallback: T): T;
/**
 * Parse JSON or return undefined.
 * @param text - JSON string to parse
 * @returns Parsed value or undefined
 */
export declare function tryParseJson<T>(text: string | null | undefined): T | undefined;
/**
 * Extract a single field from JSON string.
 * @param text - JSON string to parse
 * @param field - Field name to extract
 * @returns Field value or undefined
 */
export declare function extractJsonField<T>(text: string | null | undefined, field: string): T | undefined;
/**
 * Validate and parse with Zod schema.
 * @param text - JSON string to parse
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated value or undefined
 */
export declare function parseWithSchema<T>(text: string | null | undefined, schema: ZodSchema<T>): T | undefined;
//# sourceMappingURL=json.d.ts.map