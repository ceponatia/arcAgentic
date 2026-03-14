/**
 * Parse JSON into `unknown` to avoid leaking `any`.
 */
export function parseJson(raw) {
    return JSON.parse(raw);
}
/**
 * Parse JSON and validate with a schema that supports `safeParse`.
 * Throws an error when validation fails.
 */
export function parseJsonWithSchema(raw, schema) {
    const parsed = parseJson(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
        throw new Error(result.error.message);
    }
    return result.data;
}
