/**
 * Canonical Ummat API response shapes.
 *
 * Success: { data: T } or { data: T[], pagination: { next_cursor, has_more, total? } }
 * Error:   { error: { code, message, details?, request_id } }
 *
 * Routes return Web `Response` objects produced by these helpers; they work in
 * Next.js Route Handlers, Hasura Action handlers, Edge runtime and Node runtime alike.
 */
import { ERROR_CODES, ERROR_CODE_DEFAULT_STATUS, REQUEST_ID_HEADER, STATUS, } from './status-codes.js';
function buildHeaders(requestId, extra) {
    const h = new Headers({ 'content-type': 'application/json; charset=utf-8' });
    if (requestId)
        h.set(REQUEST_ID_HEADER, requestId);
    if (extra) {
        for (const [k, v] of Object.entries(extra))
            h.set(k, v);
    }
    return h;
}
/**
 * Canonical success response: { data: T }
 *
 *   ok({ id: 1, name: 'Foo' }, { requestId })
 *   ok(null, { status: 204, requestId })
 */
export function ok(data, init = {}) {
    const status = init.status ?? STATUS.OK;
    // 204 No Content must NOT have a body
    if (status === STATUS.NO_CONTENT) {
        return new Response(null, { status, headers: buildHeaders(init.requestId, init.headers) });
    }
    const body = { data };
    return new Response(JSON.stringify(body), {
        status,
        headers: buildHeaders(init.requestId, init.headers),
    });
}
/**
 * Canonical paginated list response: { data: T[], pagination: {...} }
 *
 *   paginate(rows, { next_cursor, has_more, total }, { requestId })
 */
export function paginate(data, pagination, init = {}) {
    const status = init.status ?? STATUS.OK;
    const body = { data, pagination };
    return new Response(JSON.stringify(body), {
        status,
        headers: buildHeaders(init.requestId, init.headers),
    });
}
/**
 * Canonical error response: { error: { code, message, details?, request_id } }
 *
 * Status defaults to the canonical code's default status; pass an explicit `status`
 * only when overriding (rare).
 *
 *   err('VALIDATION_FAILED', 'Body did not match schema', fieldErrors, { requestId })
 *   err('NOT_FOUND', 'Entity not found', undefined, { requestId })
 */
export function err(code, message, details, init = {}) {
    const defaultStatus = ERROR_CODE_DEFAULT_STATUS[code];
    const status = init.status ?? defaultStatus ?? STATUS.INTERNAL_SERVER_ERROR;
    const body = {
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
            request_id: init.requestId ?? '',
        },
    };
    return new Response(JSON.stringify(body), {
        status,
        headers: buildHeaders(init.requestId, init.headers),
    });
}
/**
 * Convenience: 204 No Content with optional headers.
 */
export function noContent(init = {}) {
    return new Response(null, {
        status: STATUS.NO_CONTENT,
        headers: buildHeaders(init.requestId, init.headers),
    });
}
/**
 * Convenience: 308 Permanent Redirect to the given absolute or relative URL.
 * Used by T16 health/unsubscribe consolidation.
 */
export function redirect(location, init = {}) {
    const headers = buildHeaders(init.requestId, init.headers);
    headers.set('location', location);
    return new Response(null, {
        status: init.status ?? STATUS.PERMANENT_REDIRECT,
        headers,
    });
}
export { ERROR_CODES };
//# sourceMappingURL=responses.js.map