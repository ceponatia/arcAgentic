/**
 * Generate a UUID using cryptographically secure randomness.
 *
 * Prefers the built-in crypto.randomUUID(), with secure fallbacks for
 * environments where it is not available.
 */
export declare function generateId(): string;
/**
 * Generate a prefixed ID (e.g., "char-abc123").
 * Useful for creating human-readable IDs with type hints.
 */
export declare function generatePrefixedId(prefix: string): string;
/**
 * Generate a session-scoped instance ID.
 * Format: {templateId}-{uuid}
 */
export declare function generateInstanceId(templateId: string): string;
/**
 * Generate a UUID in a compact (no dashes) hex format.
 *
 * Useful for building composite IDs where '-' is reserved as a delimiter.
 * Example output: 89dcf560f1444bc6a3cddad235ed4351
 */
export declare function generateCompactUuid(): string;
/**
 * Generate a short opaque ID.
 *
 * This is derived from a cryptographically-secure UUID, then compacted.
 * Output is lowercase hex.
 */
export declare function generateShortId(length?: number): string;
/**
 * Generate a UI-local ID safe for use in composite IDs.
 *
 * Format: {prefix}_{shortHex}
 * - Avoids '-' so callers can safely compose IDs using '-' as a delimiter
 * - Uses cryptographically secure randomness (via generateId)
 */
export declare function generateLocalId(prefix: string, shortLength?: number): string;
/**
 * Returns true if the value is a RFC4122-compliant UUID string.
 *
 * Validates UUID format with version 1-5 and variant 8-B.
 * Useful for validating entity profile IDs and other UUID-based identifiers.
 */
export declare function isUuid(value: string): boolean;
/**
 * Coerce a plain string to a SessionId branded type.
 * Use when passing session IDs to @arcagentic/db functions.
 *
 * Note: This is a type-level coercion only. The runtime value remains a string.
 */
export declare function toSessionId<T extends string>(id: T): T;
/**
 * Coerce a plain string to an EntityProfileId branded type.
 * Use when passing entity profile IDs to @arcagentic/db functions.
 *
 * Note: This is a type-level coercion only. The runtime value remains a string.
 */
export declare function toEntityProfileId<T extends string>(id: T): T;
/**
 * Coerce a plain string to a generic ID branded type.
 * Use when passing generic IDs to @arcagentic/db functions.
 *
 * Note: This is a type-level coercion only. The runtime value remains a string.
 */
export declare function toId<T extends string>(id: T): T;
/**
 * Coerce an array of plain strings to branded ID types.
 * Use with inArray() and similar functions that accept multiple IDs.
 *
 * Note: This is a type-level coercion only. The runtime values remain strings.
 */
export declare function toIds<T extends string>(ids: T[]): T[];
//# sourceMappingURL=id.d.ts.map