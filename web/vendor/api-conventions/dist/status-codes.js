/**
 * Canonical HTTP status codes used across the Ummat API surface.
 *
 * Discipline (per Wave-5-API spec):
 *   - 400 = "I cannot parse this" (malformed JSON, missing required header before validation)
 *   - 401 = unauthenticated (no/invalid credential)
 *   - 403 = authenticated but not authorized (RBAC denial)
 *   - 404 = resource genuinely does not exist
 *   - 409 = uniqueness conflict, max-owned reached, double-claim
 *   - 410 = resource permanently removed
 *   - 422 = "I parsed it; it is wrong" (zod validation failure, business rule violation)
 *   - 429 = rate limited
 *   - 451 = blocked for legal reasons (geo/content)
 *   - 500 = unexpected server error
 *   - 502 = upstream failure
 *   - 503 = service unavailable (maintenance, plugin restart)
 *   - 504 = upstream timeout
 *
 * The numeric constants are exported as a frozen object so consumers cannot mutate them.
 */
export const STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    PERMANENT_REDIRECT: 308,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    GONE: 410,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
});
/**
 * Canonical error codes. Routes pick from this set; consumers may switch on it.
 * Codes are stable strings. Add new codes here, never inline at call site.
 */
export const ERROR_CODES = Object.freeze({
    // 400
    MALFORMED_REQUEST: 'MALFORMED_REQUEST',
    // 401
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    // 403
    FORBIDDEN: 'FORBIDDEN',
    INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
    // 404
    NOT_FOUND: 'NOT_FOUND',
    // 409
    CONFLICT: 'CONFLICT',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    MAX_OWNED_REACHED: 'MAX_OWNED_REACHED',
    DOUBLE_CLAIM: 'DOUBLE_CLAIM',
    // 410
    GONE: 'GONE',
    // 422
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
    // 429
    RATE_LIMITED: 'RATE_LIMITED',
    // 451
    LEGALLY_BLOCKED: 'LEGALLY_BLOCKED',
    // 500
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    // 502
    UPSTREAM_FAILURE: 'UPSTREAM_FAILURE',
    // 503
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    // 504
    UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
});
/**
 * Default mapping of error code → HTTP status.
 * Routes can override per call by passing explicit status to err().
 */
export const ERROR_CODE_DEFAULT_STATUS = Object.freeze({
    MALFORMED_REQUEST: STATUS.BAD_REQUEST,
    UNAUTHENTICATED: STATUS.UNAUTHORIZED,
    INVALID_CREDENTIALS: STATUS.UNAUTHORIZED,
    TOKEN_EXPIRED: STATUS.UNAUTHORIZED,
    FORBIDDEN: STATUS.FORBIDDEN,
    INSUFFICIENT_ROLE: STATUS.FORBIDDEN,
    NOT_FOUND: STATUS.NOT_FOUND,
    CONFLICT: STATUS.CONFLICT,
    ALREADY_EXISTS: STATUS.CONFLICT,
    MAX_OWNED_REACHED: STATUS.CONFLICT,
    DOUBLE_CLAIM: STATUS.CONFLICT,
    GONE: STATUS.GONE,
    VALIDATION_FAILED: STATUS.UNPROCESSABLE_ENTITY,
    BUSINESS_RULE_VIOLATION: STATUS.UNPROCESSABLE_ENTITY,
    RATE_LIMITED: STATUS.TOO_MANY_REQUESTS,
    LEGALLY_BLOCKED: STATUS.UNAVAILABLE_FOR_LEGAL_REASONS,
    INTERNAL_ERROR: STATUS.INTERNAL_SERVER_ERROR,
    UPSTREAM_FAILURE: STATUS.BAD_GATEWAY,
    SERVICE_UNAVAILABLE: STATUS.SERVICE_UNAVAILABLE,
    UPSTREAM_TIMEOUT: STATUS.GATEWAY_TIMEOUT,
});
export const REQUEST_ID_HEADER = 'X-Request-ID';
/**
 * W3C Trace Context (traceparent) header — T-P7-SIEGE-R2-14.
 * Propagated inbound → outbound across all Hasura action calls, Remote Schema
 * requests, Stripe webhook handlers, and BullMQ job payloads.
 * Format: `00-{traceId}-{spanId}-{flags}` (W3C Trace Context Level 1, RFC).
 *
 * Usage:
 *   // In Edge middleware (Next.js) — forward inbound traceparent downstream
 *   const tp = extractTraceparent(req.headers)
 *   if (tp) res.headers.set(TRACEPARENT_HEADER, tp)
 *
 *   // In server Route Handler — echo inbound, generate if absent
 *   const tp = getOrCreateTraceparent(req.headers)
 *   // pass tp in fetch() headers to downstream services
 */
export const TRACEPARENT_HEADER = 'traceparent';
export const TRACESTATE_HEADER = 'tracestate';
/** Regexp matching the W3C traceparent format (version 00 only for now). */
const TRACEPARENT_RE = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
/** Returns true iff the string is a valid W3C traceparent header value. */
export function isValidTraceparent(s) {
    return typeof s === 'string' && TRACEPARENT_RE.test(s);
}
/**
 * Extract the traceparent header value from a request source.
 * Returns null if absent or malformed (do not propagate malformed values).
 */
export function extractTraceparent(source) {
    let raw = null;
    if (source instanceof Request) {
        raw = source.headers.get(TRACEPARENT_HEADER);
    }
    else if (source instanceof Headers) {
        raw = source.get(TRACEPARENT_HEADER);
    }
    else {
        const v = source[TRACEPARENT_HEADER];
        raw = Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    }
    return isValidTraceparent(raw) ? raw : null;
}
/**
 * Generate a synthetic W3C traceparent value for requests that arrive without one.
 * Uses crypto.randomUUID() (available in all modern runtimes including Vercel Edge).
 */
export function generateTraceparent() {
    // crypto.randomUUID produces "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" (36 chars).
    // Strip dashes → 32-char trace-id; take first 16 chars → 16-char span-id; flags=01 (sampled).
    const raw = crypto.randomUUID().replace(/-/g, '');
    const traceId = raw; // 32 hex chars
    const spanId = raw.slice(0, 16); // 16 hex chars
    return `00-${traceId}-${spanId}-01`;
}
/**
 * Extract existing traceparent or generate a fresh one.
 * Use this in middleware so every request has a traceparent for downstream propagation.
 */
export function getOrCreateTraceparent(source) {
    return extractTraceparent(source) ?? generateTraceparent();
}
//# sourceMappingURL=status-codes.js.map