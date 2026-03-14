// Shared types for @arcagentic/utils
/**
 * Creates a successful Result.
 */
export function ok(value) {
    return { ok: true, value };
}
/**
 * Creates a failed Result.
 */
export function err(error) {
    return { ok: false, error };
}
