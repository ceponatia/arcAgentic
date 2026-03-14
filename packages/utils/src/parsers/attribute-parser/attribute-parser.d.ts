import type { ParserPattern, ExtractedAttribute, ParserLlmProvider, AttributeParserConfig } from './types.js';
export type { ParserPattern, ExtractedAttribute, ParserLlmProvider, AttributeParserConfig };
/**
 * Service responsible for parsing and normalizing profile data.
 * Handles extraction of structured attributes from free-text.
 */
export declare class AttributeParser {
    /** Default parsing patterns */
    private readonly patterns;
    private readonly llmProvider;
    constructor(config?: AttributeParserConfig);
    /**
     * Parse text to extract attributes.
     * Tries regex patterns first, then LLM if available and no patterns matched.
     */
    parse(text: string): Promise<ExtractedAttribute[]>;
    /**
     * Extract structured data using regex patterns.
     */
    private extractWithPatterns;
    /**
     * Extract structured data using the LLM.
     */
    private extractWithLlm;
    /**
     * Parse the LLM response to extract attributes.
     */
    private parseLlmResponse;
}
/**
 * Default patterns for extracting character attributes.
 */
export declare const DEFAULT_PARSER_PATTERNS: ParserPattern[];
//# sourceMappingURL=attribute-parser.d.ts.map