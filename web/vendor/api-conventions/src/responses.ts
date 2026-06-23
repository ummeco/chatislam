/**
 * Canonical Ummat API response shapes.
 *
 * Success: { data: T } or { data: T[], pagination: { next_cursor, has_more, total? } }
 * Error:   { error: { code, message, details?, request_id } }
 *
 * Routes return Web `Response` objects produced by these helpers; they work in
 * Next.js Route Handlers, Hasura Action handlers, Edge runtime and Node runtime alike.
 */

import {
  ERROR_CODES,
  ERROR_CODE_DEFAULT_STATUS,
  REQUEST_ID_HEADER,
  STATUS,
  type ErrorCode,
  type Status,
} from './status-codes.js';

export type Pagination = {
  next_cursor: string | null;
  has_more: boolean;
  total?: number;
};

export type SuccessBody<T> = { data: T };
export type ListBody<T> = { data: T[]; pagination: Pagination };
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

function buildHeaders(requestId: string | undefined, extra?: Record<string, string>): Headers {
  const h = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  if (requestId) h.set(REQUEST_ID_HEADER, requestId);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) h.set(k, v);
  }
  return h;
}

/**
 * Canonical success response: { data: T }
 *
 *   ok({ id: 1, name: 'Foo' }, { requestId })
 *   ok(null, { status: 204, requestId })
 */
export function ok<T>(data: T, init: ResponseInit2 = {}): Response {
  const status = init.status ?? STATUS.OK;
  // 204 No Content must NOT have a body
  if (status === STATUS.NO_CONTENT) {
    return new Response(null, { status, headers: buildHeaders(init.requestId, init.headers) });
  }
  const body: SuccessBody<T> = { data };
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
export function paginate<T>(
  data: T[],
  pagination: Pagination,
  init: ResponseInit2 = {}
): Response {
  const status = init.status ?? STATUS.OK;
  const body: ListBody<T> = { data, pagination };
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
export function err(
  code: ErrorCode | string,
  message: string,
  details?: unknown,
  init: ResponseInit2 = {}
): Response {
  const defaultStatus = (ERROR_CODE_DEFAULT_STATUS as Record<string, Status>)[code];
  const status = init.status ?? defaultStatus ?? STATUS.INTERNAL_SERVER_ERROR;
  const body: ErrorBody = {
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
export function noContent(init: ResponseInit2 = {}): Response {
  return new Response(null, {
    status: STATUS.NO_CONTENT,
    headers: buildHeaders(init.requestId, init.headers),
  });
}

/**
 * Convenience: 308 Permanent Redirect to the given absolute or relative URL.
 * Used by T16 health/unsubscribe consolidation.
 */
export function redirect(location: string, init: ResponseInit2 = {}): Response {
  const headers = buildHeaders(init.requestId, init.headers);
  headers.set('location', location);
  return new Response(null, {
    status: init.status ?? STATUS.PERMANENT_REDIRECT,
    headers,
  });
}

export { ERROR_CODES };
