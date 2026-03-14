import type { ParsedPlayerInput } from '@arcagentic/schemas';
/**
 * Deterministically parses player input into segments based on markers.
 *
 * Conventions:
 * - Plain text → speech (observable)
 * - ~text~ → thought (not observable)
 * - *text* → action (observable)
 *
 * @param input - Raw player input string
 * @returns Parsed input with segments
 */
export declare function parsePlayerInput(input: string): ParsedPlayerInput;
//# sourceMappingURL=input-parser.d.ts.map