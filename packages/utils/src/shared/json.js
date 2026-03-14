import { getRecordOptional } from '@arcagentic/schemas';
/**
 * Safely parse JSON with typed fallback.
 * @param text - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed value or fallback
 */
export function safeParseJson(text, fallback) {
    if (!text)
        return fallback;
    try {
        return JSON.parse(text);
    }
    catch {
        return fallback;
    }
}
/**
 * Parse JSON or return undefined.
 * @param text - JSON string to parse
 * @returns Parsed value or undefined
 */
export function tryParseJson(text) {
    if (!text)
        return undefined;
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
/**
 * Extract a single field from JSON string.
 * @param text - JSON string to parse
 * @param field - Field name to extract
 * @returns Field value or undefined
 */
export function extractJsonField(text, field) {
    if (!text)
        return undefined;
    try {
        const parsed = JSON.parse(text);
        const value = getRecordOptional(parsed, field);
        return value;
    }
    catch {
        return undefined;
    }
}
/**
 * Validate and parse with Zod schema.
 * @param text - JSON string to parse
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated value or undefined
 */
export function parseWithSchema(text, schema) {
    if (!text)
        return undefined;
    try {
        const parsed = JSON.parse(text);
        const result = schema.safeParse(parsed);
        return result.success ? result.data : undefined;
    }
    catch {
        return undefined;
    }
}
