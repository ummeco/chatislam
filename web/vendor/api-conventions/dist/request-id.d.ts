/**
 * Request ID generation + extraction.
 *
 * - Reads `X-Request-ID` from the incoming request header.
 * - Validates as UUIDv7 (or generates a fresh one if missing/invalid).
 * - Returns a stable string for logging, response header echo, Sentry tag.
 *
 * UUIDv7 (RFC 9562) is monotonic + sortable by time, which makes log correlation
 * and database-sorted lookups efficient.
 */
import { REQUEST_ID_HEADER } from './status-codes.js';
/**
 * Returns true iff the input is a valid lower-cased or upper-cased UUID
 * (any version). We do not require v7 specifically because upstream proxies
 * may set v4; we only enforce shape.
 */
export declare function isValidRequestId(s: unknown): s is string;
/**
 * Generate a fresh UUIDv7.
 */
export declare function generateRequestId(): string;
/**
 * Extract or generate a request id for the given request.
 *
 * Accepts a Web `Request`, a `Headers` instance, or a plain Record<string,string>.
 */
export declare function getOrCreateRequestId(source: Request | Headers | Record<string, string | string[] | undefined>): string;
export { REQUEST_ID_HEADER };
//# sourceMappingURL=request-id.d.ts.map