/**
 * Parse JSON into `unknown` to avoid leaking `any`.
 */
export declare function parseJson(raw: string): unknown;
/**
 * Parse JSON and validate with a schema that supports `safeParse`.
 * Throws an error when validation fails.
 */
export declare function parseJsonWithSchema<T>(raw: string, schema: {
    safeParse: (value: unknown) => {
        success: true;
        data: T;
    } | {
        success: false;
        error: {
            message: string;
        };
    };
}): T;
//# sourceMappingURL=json.d.ts.map