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

import { uuidv7 } from 'uuidv7';
import { REQUEST_ID_HEADER } from './status-codes.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true iff the input is a valid lower-cased or upper-cased UUID
 * (any version). We do not require v7 specifically because upstream proxies
 * may set v4; we only enforce shape.
 */
export function isValidRequestId(s: unknown): s is string {
  return typeof s === 'string' && s.length === 36 && UUID_RE.test(s);
}

/**
 * Generate a fresh UUIDv7.
 */
export function generateRequestId(): string {
  return uuidv7();
}

/**
 * Extract or generate a request id for the given request.
 *
 * Accepts a Web `Request`, a `Headers` instance, or a plain Record<string,string>.
 */
export function getOrCreateRequestId(
  source: Request | Headers | Record<string, string | string[] | undefined>
): string {
  let raw: string | null | undefined = null;
  if (source instanceof Request) {
    raw = source.headers.get(REQUEST_ID_HEADER) ?? source.headers.get(REQUEST_ID_HEADER.toLowerCase());
  } else if (source instanceof Headers) {
    raw = source.get(REQUEST_ID_HEADER) ?? source.get(REQUEST_ID_HEADER.toLowerCase());
  } else {
    const direct = source[REQUEST_ID_HEADER] ?? source[REQUEST_ID_HEADER.toLowerCase()];
    if (Array.isArray(direct)) raw = direct[0] ?? null;
    else raw = direct ?? null;
  }
  if (isValidRequestId(raw)) return raw;
  return generateRequestId();
}

export { REQUEST_ID_HEADER };
