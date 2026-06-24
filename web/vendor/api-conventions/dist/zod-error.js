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
import { err } from './responses.js';
import { ERROR_CODES } from './status-codes.js';
/**
 * Format a single zod path array into a stable, human-readable string.
 *
 *   []                  → ''
 *   ['name']            → 'name'
 *   ['user', 'email']   → 'user.email'
 *   ['items', 0, 'sku'] → 'items[0].sku'
 *   [0, 'foo']          → '[0].foo'
 */
export function formatZodPath(path) {
    let out = '';
    for (const seg of path) {
        if (typeof seg === 'number') {
            out += `[${seg}]`;
        }
        else {
            const s = String(seg);
            out += out.length === 0 ? s : `.${s}`;
        }
    }
    return out;
}
/**
 * Convert a ZodError into the canonical {fieldErrors, formErrors} shape.
 */
export function zodErrorToDetails(error) {
    const fieldErrors = {};
    const formErrors = [];
    // ZodError.issues is the canonical name in zod v3+ and zod v4+.
    // Defensive access in case the structure changes.
    const issues = error.issues ?? [];
    for (const issue of issues) {
        const path = formatZodPath(issue.path ?? []);
        const message = issue.message ?? 'Invalid input';
        if (path === '') {
            formErrors.push(message);
        }
        else {
            const arr = fieldErrors[path] ?? [];
            arr.push(message);
            fieldErrors[path] = arr;
        }
    }
    return { fieldErrors, formErrors };
}
/**
 * Build a canonical 422 Response from a ZodError.
 *
 *   const parsed = Schema.safeParse(body)
 *   if (!parsed.success) return zodError(parsed.error, { requestId })
 */
export function zodError(error, init = {}) {
    return err(ERROR_CODES.VALIDATION_FAILED, init.message ?? 'Request body failed validation', zodErrorToDetails(error), { requestId: init.requestId });
}
//# sourceMappingURL=zod-error.js.map