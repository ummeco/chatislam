export { A as AsyncRouteHandler, E as ErrorCode, R as Result, U as UmmatError, W as WithErrorBoundaryOptions, c as createError, e as err, a as errorCodeToStatus, f as foldAsync, i as isErr, b as isOk, m as map, o as ok, t as toUmmatError, u as unwrap, w as withErrorBoundaryRoute } from './route-wrapper-D-4NB9ZV.js';

/**
 * FILE:    @ummat/errors/idempotency.ts
 * PURPOSE: generateIdempotencyKey() utility for idempotent request deduplication.
 *          Returns a UUID v4 string that clients can include in request headers.
 * INVARIANTS:
 *   - Returns a valid UUID v4 string
 *   - Each call returns a new unique key
 *   - Safe for use in HTTP headers and request bodies
 * SPEC:    P2 Robustness Framework spec §4.4
 */
/**
 * Generate a UUID v4 string for idempotency keys.
 * Use this to create Idempotency-Key headers on request-mutation operations.
 */
declare function generateIdempotencyKey(): string;

export { generateIdempotencyKey };
