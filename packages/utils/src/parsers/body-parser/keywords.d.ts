import type { RegionTexture, SensoryType } from '@arcagentic/schemas';
/**
 * Keyword mappings for body sensory parsing.
 */
export declare const INTENSITY_KEYWORDS: Record<string, number>;
export declare const TEMPERATURE_KEYWORDS: Record<string, RegionTexture['temperature']>;
export declare const MOISTURE_KEYWORDS: Record<string, RegionTexture['moisture']>;
/**
 * Keywords that indicate scent-related input or actions.
 * Used for:
 * - Parsing scent descriptions in character builder
 * - Detecting smell intent in player commands
 * - Generating scent-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export declare const SCENT_INDICATORS: readonly ["scent", "smell", "sniff", "aroma", "fragrance", "odor", "odour", "whiff", "bouquet", "reek", "stench", "perfume", "stink", "inhale", "snuff"];
/**
 * Keywords that indicate texture/touch-related input or actions.
 * Used for:
 * - Parsing texture descriptions in character builder
 * - Detecting touch intent in player commands
 * - Generating touch-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export declare const TEXTURE_INDICATORS: readonly ["texture", "feel", "touch", "surface", "handle", "grip", "stroke", "caress", "pat", "press", "rub", "poke", "prod", "grind", "tap"];
/**
 * Keywords that indicate visual-related input or actions.
 * Used for:
 * - Parsing visual descriptions in character builder
 * - Detecting look/examine intent in player commands
 * - Generating visual-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export declare const VISUAL_INDICATORS: readonly ["visual", "look", "see", "appearance", "color", "colour", "examine", "inspect", "observe", "watch", "gaze", "stare", "glance", "view", "peer", "survey", "scan"];
/**
 * Keywords that indicate flavor/taste-related input or actions.
 * Used for:
 * - Parsing flavor descriptions in character builder
 * - Detecting taste intent in player commands
 * - Generating taste-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export declare const FLAVOR_INDICATORS: readonly ["flavor", "flavour", "taste", "lick", "sample", "sip", "bite", "eat", "nibble", "savor", "savour", "chew"];
/**
 * Keywords that indicate sound/hearing-related input or actions.
 * Used for:
 * - Detecting listen intent in player commands
 * - Generating sound-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export declare const SOUND_INDICATORS: readonly ["sound", "hear", "listen", "noise", "audio", "eavesdrop", "hearken"];
/**
 * All sensory indicator arrays grouped by sense type.
 */
export declare const SENSORY_INDICATORS: {
    readonly scent: readonly ["scent", "smell", "sniff", "aroma", "fragrance", "odor", "odour", "whiff", "bouquet", "reek", "stench", "perfume", "stink", "inhale", "snuff"];
    readonly texture: readonly ["texture", "feel", "touch", "surface", "handle", "grip", "stroke", "caress", "pat", "press", "rub", "poke", "prod", "grind", "tap"];
    readonly visual: readonly ["visual", "look", "see", "appearance", "color", "colour", "examine", "inspect", "observe", "watch", "gaze", "stare", "glance", "view", "peer", "survey", "scan"];
    readonly flavor: readonly ["flavor", "flavour", "taste", "lick", "sample", "sip", "bite", "eat", "nibble", "savor", "savour", "chew"];
    readonly sound: readonly ["sound", "hear", "listen", "noise", "audio", "eavesdrop", "hearken"];
};
/**
 * Check if text contains a sensory keyword, accounting for common verb conjugations.
 * Uses word boundaries (\b) to ensure:
 * - Suffixes only match at the END of words (not in the middle)
 * - No spaces between root and suffix
 * - Prevents false positives in compound words
 *
 * Examples:
 * - "smell" matches: "smell", "smells", "smelling", "smelled"
 * - "smell" does NOT match: "goodsmell", "re-smell", "smell ing" (with space)
 *
 * @param text - The text to search in
 * @param keywords - Array of base keywords to match
 * @returns True if any keyword (with or without suffix) is found
 */
export declare function containsSensoryKeyword(text: string, keywords: readonly string[]): boolean;
/**
 * Detect sensory type from text using suffix-aware keyword matching.
 * Matches base keywords plus common conjugations (s, es, ed, ing, er, est).
 */
export declare function detectSensoryType(text: string): SensoryType | null;
/**
 * Get an appropriate intensity keyword for a numeric intensity value.
 * Useful for generating narrative descriptions.
 *
 * @param intensity - Numeric intensity from 0.0 to 1.0
 * @returns An intensity keyword (e.g., "strong", "faint", "moderate")
 */
export declare function getIntensityWord(intensity: number): string;
/**
 * Get a set of intensity keywords that match a numeric range.
 * Useful for parsing player input with intensity modifiers.
 *
 * @param minIntensity - Minimum intensity (0.0 to 1.0)
 * @param maxIntensity - Maximum intensity (0.0 to 1.0)
 * @returns Array of keywords that fall within the range
 */
export declare function getIntensityKeywordsInRange(minIntensity: number, maxIntensity: number): string[];
/**
 * Extract intensity from a phrase, returning both the value and cleaned phrase.
 */
export declare function extractIntensity(phrase: string): {
    intensity: number;
    cleaned: string;
};
/**
 * Extract temperature from a phrase.
 */
export declare function extractTemperature(phrase: string): {
    temperature: RegionTexture['temperature'];
    cleaned: string;
};
/**
 * Extract moisture from a phrase.
 */
export declare function extractMoisture(phrase: string): {
    moisture: RegionTexture['moisture'];
    cleaned: string;
};
//# sourceMappingURL=keywords.d.ts.map