import type { JsonPatchOperation } from '@arcagentic/schemas';
/**
 * Check if value is a plain object (not array, null, Date, etc.).
 */
export declare function isPlainObject(v: unknown): v is Record<string, unknown>;
/**
 * Deep merge with array replacement semantics.
 *
 * When merging objects:
 * - Arrays in override completely replace arrays in base
 * - Objects are recursively merged
 * - Primitives in override replace primitives in base
 *
 * @param base - Base object to merge into
 * @param override - Override object to merge from
 * @returns Merged object
 */
export declare function deepMergeReplaceArrays<T>(base: T, override: unknown): T;
/**
 * Deep clone a JSON-serializable value.
 */
export declare function deepClone<T>(value: T): T;
export interface DeepDiffResult {
    diff: unknown;
    addedPaths: string[];
    removedPaths: string[];
    modifiedPaths: string[];
    isIdentical: boolean;
}
/**
 * Compare two objects and compute the minimal diff.
 */
export declare function deepDiff<T>(original: T, modified: T): DeepDiffResult;
/**
 * Extracts a unique list of paths from an array of JSON patches.
 *
 * @param patches - Array of JSON patch operations
 * @returns Array of unique paths modified by the patches
 */
export declare function extractPathsFromPatches(patches: readonly JsonPatchOperation[]): string[];
//# sourceMappingURL=object.d.ts.map