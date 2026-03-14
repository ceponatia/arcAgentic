/**
 * Body sensory data parsing functions.
 */
import type { BodyMap, BodyRegion, RegionScent, RegionTexture, RegionVisual, RegionFlavor } from '@arcagentic/schemas';
export interface BodyEntryInput {
    /** Raw text for a single body region entry, e.g., "hair: scent: musky, floral" */
    raw: string;
}
export interface ParsedBodyEntry {
    region: BodyRegion;
    scent?: RegionScent;
    texture?: RegionTexture;
    visual?: RegionVisual;
    flavor?: RegionFlavor;
}
export interface BodyParseResult {
    bodyMap: BodyMap;
    warnings: string[];
}
/**
 * Parse a scent description into RegionScent.
 * Input: "strong musk, lightly floral, hint of vanilla"
 * Output: { primary: "musk", notes: ["floral", "vanilla"], intensity: 0.8 }
 */
export declare function parseScent(description: string): RegionScent | undefined;
/**
 * Parse a texture description into RegionTexture.
 * Input: "calloused, warm, slightly damp"
 * Output: { primary: "calloused", temperature: "warm", moisture: "damp" }
 */
export declare function parseTexture(description: string): RegionTexture | undefined;
/**
 * Parse a visual description into RegionVisual.
 * Input: "long auburn waves, freckled, slight scar"
 * Output: { description: "long auburn waves", features: ["freckled", "slight scar"] }
 */
export declare function parseVisual(description: string): RegionVisual | undefined;
/**
 * Parse a flavor description into RegionFlavor.
 * Input: "strong salty, slightly sweet, hint of metallic"
 * Output: { primary: "salty", notes: ["sweet", "metallic"], intensity: 0.8 }
 */
export declare function parseFlavor(description: string): RegionFlavor | undefined;
/**
 * Parse a single body entry line.
 * Formats supported:
 *   "hair: scent: musky, floral"
 *   "hair scent: musky"
 *   "hair - scent - musky"
 */
export declare function parseBodyEntry(input: string): ParsedBodyEntry | null;
/**
 * Parse multiple body entries (one per line or semicolon-separated).
 */
export declare function parseBodyEntries(input: string): BodyParseResult;
//# sourceMappingURL=parsers.d.ts.map