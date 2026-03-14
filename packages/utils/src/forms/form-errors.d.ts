import type { ZodError } from 'zod';
import type { FieldErrorMap } from './types.js';
export type { FieldErrorMap };
export declare function mapZodErrorsToFields<FieldKey extends string = string>(error: ZodError<unknown>, opts: {
    pathToField: (path: (string | number)[]) => FieldKey | undefined;
    maxPerField?: number;
}): FieldErrorMap<FieldKey>;
export declare function getInlineErrorProps(fieldKey: string, message?: string): {
    readonly 'aria-invalid'?: never;
    readonly 'aria-describedby'?: never;
} | {
    readonly 'aria-invalid': true;
    readonly 'aria-describedby': string;
};
//# sourceMappingURL=form-errors.d.ts.map