// =============================================================================
// Utilities
// =============================================================================
/**
 * Build provider options object, excluding undefined values.
 */
export function buildProviderOptions(opts) {
    if (!opts)
        return {};
    const out = {};
    if (opts.temperature !== undefined)
        out.temperature = opts.temperature;
    if (opts.top_p !== undefined)
        out.top_p = opts.top_p;
    if (opts.max_tokens !== undefined)
        out.max_tokens = opts.max_tokens;
    return out;
}
