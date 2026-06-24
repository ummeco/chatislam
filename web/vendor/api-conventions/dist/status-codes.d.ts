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
export declare const STATUS: Readonly<{
    readonly OK: 200;
    readonly CREATED: 201;
    readonly ACCEPTED: 202;
    readonly NO_CONTENT: 204;
    readonly PERMANENT_REDIRECT: 308;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly METHOD_NOT_ALLOWED: 405;
    readonly CONFLICT: 409;
    readonly GONE: 410;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly UNAVAILABLE_FOR_LEGAL_REASONS: 451;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
    readonly GATEWAY_TIMEOUT: 504;
}>;
export type Status = (typeof STATUS)[keyof typeof STATUS];
/**
 * Canonical error codes. Routes pick from this set; consumers may switch on it.
 * Codes are stable strings. Add new codes here, never inline at call site.
 */
export declare const ERROR_CODES: Readonly<{
    readonly MALFORMED_REQUEST: "MALFORMED_REQUEST";
    readonly UNAUTHENTICATED: "UNAUTHENTICATED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly INSUFFICIENT_ROLE: "INSUFFICIENT_ROLE";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly MAX_OWNED_REACHED: "MAX_OWNED_REACHED";
    readonly DOUBLE_CLAIM: "DOUBLE_CLAIM";
    readonly GONE: "GONE";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly LEGALLY_BLOCKED: "LEGALLY_BLOCKED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly UPSTREAM_FAILURE: "UPSTREAM_FAILURE";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly UPSTREAM_TIMEOUT: "UPSTREAM_TIMEOUT";
}>;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
/**
 * Default mapping of error code → HTTP status.
 * Routes can override per call by passing explicit status to err().
 */
export declare const ERROR_CODE_DEFAULT_STATUS: Readonly<Record<ErrorCode, Status>>;
export declare const REQUEST_ID_HEADER: "X-Request-ID";
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
export declare const TRACEPARENT_HEADER: "traceparent";
export declare const TRACESTATE_HEADER: "tracestate";
/** Returns true iff the string is a valid W3C traceparent header value. */
export declare function isValidTraceparent(s: unknown): s is string;
/**
 * Extract the traceparent header value from a request source.
 * Returns null if absent or malformed (do not propagate malformed values).
 */
export declare function extractTraceparent(source: Request | Headers | Record<string, string | string[] | undefined>): string | null;
/**
 * Generate a synthetic W3C traceparent value for requests that arrive without one.
 * Uses crypto.randomUUID() (available in all modern runtimes including Vercel Edge).
 */
export declare function generateTraceparent(): string;
/**
 * Extract existing traceparent or generate a fresh one.
 * Use this in middleware so every request has a traceparent for downstream propagation.
 */
export declare function getOrCreateTraceparent(source: Request | Headers | Record<string, string | string[] | undefined>): string;
//# sourceMappingURL=status-codes.d.ts.map