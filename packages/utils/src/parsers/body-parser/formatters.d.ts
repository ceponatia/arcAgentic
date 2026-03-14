/**
 * Body sensory data formatting functions.
 * Convert BodyMap structures back to human-readable text.
 */
import type { BodyMap, RegionScent, RegionTexture, RegionVisual, RegionFlavor } from '@arcagentic/schemas';
/**
 * Format a RegionScent back to human-readable text.
 */
export declare function formatScent(scent: RegionScent): string;
/**
 * Format a RegionTexture back to human-readable text.
 */
export declare function formatTexture(texture: RegionTexture): string;
/**
 * Format a RegionVisual back to human-readable text.
 */
export declare function formatVisual(visual: RegionVisual): string;
/**
 * Format a RegionFlavor back to human-readable text.
 */
export declare function formatFlavor(flavor: RegionFlavor): string;
/**
 * Format a full BodyMap to human-readable text (one line per region/sensory type).
 */
export declare function formatBodyMap(bodyMap: BodyMap): string;
//# sourceMappingURL=formatters.d.ts.map