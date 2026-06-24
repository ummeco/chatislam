/**
 * Zod ZodError → 422 Unprocessable Entity response shape mapper.
 *
 * Output details shape:
 *   {
 *     fieldErrors: { "path.to.field": ["message", ...], "[2].name": [...] },
 *     formErrors:  ["top-level message", ...]
 *   }
 *
 * Path components are joined with '.' for object keys and bracketed for array indices,
 * e.g. `entities[0].slug`.
 */
import type { ZodError } from 'zod';
export type ZodErrorDetails = {
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
};
/**
 * Format a single zod path array into a stable, human-readable string.
 *
 *   []                  → ''
 *   ['name']            → 'name'
 *   ['user', 'email']   → 'user.email'
 *   ['items', 0, 'sku'] → 'items[0].sku'
 *   [0, 'foo']          → '[0].foo'
 */
export declare function formatZodPath(path: ReadonlyArray<PropertyKey>): string;
/**
 * Convert a ZodError into the canonical {fieldErrors, formErrors} shape.
 */
export declare function zodErrorToDetails(error: ZodError): ZodErrorDetails;
/**
 * Build a canonical 422 Response from a ZodError.
 *
 *   const parsed = Schema.safeParse(body)
 *   if (!parsed.success) return zodError(parsed.error, { requestId })
 */
export declare function zodError(error: ZodError, init?: {
    requestId?: string;
    message?: string;
}): Response;
//# sourceMappingURL=zod-error.d.ts.map