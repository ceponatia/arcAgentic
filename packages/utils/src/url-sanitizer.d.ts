/**
 * URL sanitization and validation utilities
 */
/**
 * Sanitizes a URL by removing sensitive information and validating its structure
 */
export declare function sanitizeUrl(url: string): string;
/**
 * Safely checks if a URL contains a specific domain without substring vulnerabilities
 */
export declare function isUrlDomain(url: string, domain: string): boolean;
/**
 * Redacts sensitive information from a URL for logging
 */
export declare function redactUrlForLogging(url: string): string;
//# sourceMappingURL=url-sanitizer.d.ts.map