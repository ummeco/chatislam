/**
 * Canonical Ummat API response shapes.
 *
 * Success: { data: T } or { data: T[], pagination: { next_cursor, has_more, total? } }
 * Error:   { error: { code, message, details?, request_id } }
 *
 * Routes return Web `Response` objects produced by these helpers; they work in
 * Next.js Route Handlers, Hasura Action handlers, Edge runtime and Node runtime alike.
 */
import { ERROR_CODES, type ErrorCode, type Status } from './status-codes.js';
export type Pagination = {
    next_cursor: string | null;
    has_more: boolean;
    total?: number;
};
export type SuccessBody<T> = {
    data: T;
};
export type ListBody<T> = {
    data: T[];
    pagination: Pagination;
};
export type ErrorBody = {
    error: {
        code: ErrorCode | string;
        message: string;
        details?: unknown;
        request_id: string;
    };
};
export type ResponseInit2 = {
    status?: Status;
    requestId?: string;
    headers?: Record<string, string>;
};
/**
 * Canonical success response: { data: T }
 *
 *   ok({ id: 1, name: 'Foo' }, { requestId })
 *   ok(null, { status: 204, requestId })
 */
export declare function ok<T>(data: T, init?: ResponseInit2): Response;
/**
 * Canonical paginated list response: { data: T[], pagination: {...} }
 *
 *   paginate(rows, { next_cursor, has_more, total }, { requestId })
 */
export declare function paginate<T>(data: T[], pagination: Pagination, init?: ResponseInit2): Response;
/**
 * Canonical error response: { error: { code, message, details?, request_id } }
 *
 * Status defaults to the canonical code's default status; pass an explicit `status`
 * only when overriding (rare).
 *
 *   err('VALIDATION_FAILED', 'Body did not match schema', fieldErrors, { requestId })
 *   err('NOT_FOUND', 'Entity not found', undefined, { requestId })
 */
export declare function err(code: ErrorCode | string, message: string, details?: unknown, init?: ResponseInit2): Response;
/**
 * Convenience: 204 No Content with optional headers.
 */
export declare function noContent(init?: ResponseInit2): Response;
/**
 * Convenience: 308 Permanent Redirect to the given absolute or relative URL.
 * Used by T16 health/unsubscribe consolidation.
 */
export declare function redirect(location: string, init?: ResponseInit2): Response;
export { ERROR_CODES };
//# sourceMappingURL=responses.d.ts.map