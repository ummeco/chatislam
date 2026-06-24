/**
 * FILE:    @ummat/errors/result.ts
 * PURPOSE: Discriminated union Result<T,E> type for typed error handling.
 *          All async operations return Result<T, UmmatError> instead of throwing.
 * INVARIANTS:
 *   - Never throw across async boundaries
 *   - Result is a tagged union: {ok: true, value: T} | {ok: false, error: E}
 *   - Discriminant is the 'ok' boolean field
 * SPEC:    P2 Robustness Framework spec §4.1
 */
/**
 * Discriminated union for typed async results.
 * Prefer this over throwing or Promise rejection.
 */
type Result<T, E = unknown> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
/**
 * Constructor for a successful result.
 */
declare function ok<T, E = never>(value: T): Result<T, E>;
/**
 * Constructor for a failed result.
 */
declare function err<E>(error: E): Result<never, E>;
/**
 * Type guard to discriminate at runtime.
 */
declare function isOk<T, E>(result: Result<T, E>): result is {
    ok: true;
    value: T;
};
/**
 * Type guard for error state.
 */
declare function isErr<T, E>(result: Result<T, E>): result is {
    ok: false;
    error: E;
};
/**
 * Extract the value or throw if error. Use sparingly.
 */
declare function unwrap<T, E extends Error>(result: Result<T, E>): T;
/**
 * Map over the value, leaving error unchanged.
 */
declare function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
/**
 * Fold over a Result: apply one function to success, another to error.
 */
declare function foldAsync<T, E, U>(result: Result<T, E>, onOk: (value: T) => Promise<U>, onErr: (error: E) => Promise<U>): Promise<U>;

/**
 * FILE:    @ummat/errors/error.ts
 * PURPOSE: UmmatError interface and ErrorCode enum canonical to all platform errors.
 *          All async operations return Result<T, UmmatError> carrying these fields.
 * INVARIANTS:
 *   - code is always one of the 7 canonical ErrorCode values (never a raw string)
 *   - message is human-readable, safe for client display
 *   - cause holds the original error for logging; never leaks to client
 *   - context is diagnostic metadata; never leaks to client
 * SPEC:    P2 Robustness Framework spec §4.1
 */
/**
 * Canonical error codes for the entire platform.
 * All 7 codes defined in spec; each maps to HTTP status + Sentry severity.
 */
declare enum ErrorCode {
    NETWORK_OFFLINE = "NETWORK_OFFLINE",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    RATE_LIMITED = "RATE_LIMITED",
    NOT_FOUND = "NOT_FOUND",
    VALIDATION = "VALIDATION",
    INTERNAL = "INTERNAL",
    THEOLOGY_GATE = "THEOLOGY_GATE"
}
/**
 * Canonical UmmatError shape returned by Result<T, UmmatError>.
 * Safe to serialize to client; cause and context are diagnostic only.
 */
interface UmmatError {
    /**
     * Canonical error code (one of the 7 ErrorCode values).
     */
    code: ErrorCode;
    /**
     * Human-readable message safe to display to the user.
     * i18n strings are safe; never includes stack traces or internal detail.
     */
    message: string;
    /**
     * Original error (if caught from another domain).
     * Never serialized to client; for logging/diagnostics only.
     */
    cause?: unknown;
    /**
     * Diagnostic metadata: request_id, user_id, resource_id, attempt_count, etc.
     * Never serialized to client; for Sentry + structured logging.
     */
    context?: Record<string, unknown>;
    /**
     * HTTP status for this error (e.g., 401 for PERMISSION_DENIED, 429 for RATE_LIMITED).
     * Populated by platform services; may be omitted in Result context (clients use code → status).
     */
    status?: number;
}
/**
 * Create a UmmatError from constituent parts.
 */
declare function createError(code: ErrorCode, message: string, opts?: {
    cause?: unknown;
    context?: Record<string, unknown>;
    status?: number;
}): UmmatError;
/**
 * Safe coercion: if the input is already a UmmatError, pass through.
 * Otherwise wrap in INTERNAL with the original as cause.
 */
declare function toUmmatError(value: unknown): UmmatError;
/**
 * Map ErrorCode to HTTP status (used by route handlers).
 */
declare function errorCodeToStatus(code: ErrorCode): number;

/**
 * FILE:    @ummat/errors/route-wrapper.ts
 * PURPOSE: withErrorBoundary() wrapper for async route handlers (Next.js, Hono, Express).
 *          Catches thrown errors and unknown exceptions; returns Result<T, UmmatError>.
 *          Never re-throws; always returns {ok:false,error:{code:...}} on error.
 * INVARIANTS:
 *   - All errors are caught; none escape the boundary
 *   - Unknown errors are coerced to ErrorCode.INTERNAL
 *   - cause and context are never serialized to the client
 * SPEC:    P2 Robustness Framework spec §4.3
 */

/**
 * Async route handler signature (works with Next.js, Hono, Express-compatible).
 */
type AsyncRouteHandler<T = unknown> = (req: Request) => Promise<T>;
/**
 * Options for withErrorBoundary route wrapper.
 */
interface WithErrorBoundaryOptions {
    /**
     * Called when an error is caught (for Sentry, logging, etc.).
     * Use this to wire Sentry capture from @ummat/observability.
     */
    onError?: (error: UmmatError, request: Request) => void | Promise<void>;
}
/**
 * Wrap an async route handler to catch all errors and return Result<T, UmmatError>.
 * Never throws; always returns a Result that callers can destructure.
 *
 * Usage:
 *   export const POST = withErrorBoundary(async (req: Request) => {
 *     const body = await req.json();
 *     if (!body.email) throw new Error('Missing email'); // caught and wrapped
 *     return { ok: true, value: { id: 123 } }; // return Result or plain value
 *   });
 */
declare function withErrorBoundary<T>(handler: AsyncRouteHandler<T>, opts?: WithErrorBoundaryOptions): AsyncRouteHandler<Result<T, UmmatError>>;

export { type AsyncRouteHandler as A, ErrorCode as E, type Result as R, type UmmatError as U, type WithErrorBoundaryOptions as W, errorCodeToStatus as a, isOk as b, createError as c, err as e, foldAsync as f, isErr as i, map as m, ok as o, toUmmatError as t, unwrap as u, withErrorBoundary as w };
