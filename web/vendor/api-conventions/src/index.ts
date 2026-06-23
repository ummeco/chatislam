/**
 * @ummat/api-conventions — canonical API conventions across the Ummat monorepo.
 *
 * Owns:
 *   - response shapes (ok / err / paginate / noContent / redirect)
 *   - error code catalog (ERROR_CODES) + canonical HTTP status codes (STATUS)
 *   - request_id (UUIDv7) extraction + propagation
 *   - withRequestContext() HOF for Next.js Route Handlers
 *   - Zod ZodError → 422 mapper (zodError + zodErrorToDetails)
 *   - RFC 6749 §5.2 OAuth error helper (errOAuth) — carve-out for /oauth/* routes
 *
 * Pairs with @ummat/schema (input/output schemas + defineRoute, Q-TYPES T10).
 *
 * Q-API sprint S-Q-API-T01 + T07 + T10 + T11 + T16 (foundation).
 */

export {
  ok,
  err,
  paginate,
  noContent,
  redirect,
  ERROR_CODES,
} from './responses.js';
export type {
  Pagination,
  SuccessBody,
  ListBody,
  ErrorBody,
  ResponseInit2,
} from './responses.js';

export {
  STATUS,
  ERROR_CODE_DEFAULT_STATUS,
  REQUEST_ID_HEADER,
  // T-P7-SIEGE-R2-14: W3C traceparent propagation
  TRACEPARENT_HEADER,
  TRACESTATE_HEADER,
  isValidTraceparent,
  extractTraceparent,
  generateTraceparent,
  getOrCreateTraceparent,
} from './status-codes.js';
export type { Status, ErrorCode } from './status-codes.js';

export {
  generateRequestId,
  isValidRequestId,
  getOrCreateRequestId,
} from './request-id.js';

export {
  withRequestContext,
} from './with-request-context.js';
export type {
  RequestContext,
  RequestLogger,
  RouteHandler,
  WithRequestContextOptions,
} from './with-request-context.js';

export {
  zodError,
  zodErrorToDetails,
  formatZodPath,
} from './zod-error.js';
export type { ZodErrorDetails } from './zod-error.js';

export { errOAuth } from './oauth.js';
export type { OAuthError, OAuthErrorBody } from './oauth.js';
