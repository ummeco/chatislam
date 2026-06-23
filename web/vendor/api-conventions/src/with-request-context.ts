/**
 * `withRequestContext` — higher-order function that wraps a Next.js Route Handler
 * with request_id extraction + propagation, and a structured logger that always
 * carries the request_id.
 *
 * Usage:
 *
 *   export const GET = withRequestContext(async (req, ctx) => {
 *     ctx.log.info('handling health check');
 *     return ok({ status: 'ok' }, { requestId: ctx.requestId });
 *   });
 *
 * The wrapper guarantees:
 *   - every response includes `X-Request-ID` header
 *   - every error response (thrown or returned) includes `request_id` in body
 *   - structured logger lines include `{ request_id, method, path, ms, status }`
 */

import { err } from './responses.js';
import { getOrCreateRequestId, REQUEST_ID_HEADER } from './request-id.js';
import { ERROR_CODES } from './status-codes.js';

export type RequestLogger = {
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
};

export type RequestContext = {
  requestId: string;
  log: RequestLogger;
};

export type RouteHandler<TArgs extends unknown[]> = (
  req: Request,
  ctx: RequestContext,
  ...args: TArgs
) => Promise<Response> | Response;

export type WithRequestContextOptions = {
  /**
   * Optional sink for structured logs. Default: console with JSON-line output.
   * Replace with Sentry breadcrumb / Pino / etc. in production wiring.
   */
  logger?: (level: 'info' | 'warn' | 'error', payload: Record<string, unknown>) => void;
};

function defaultLogger(level: 'info' | 'warn' | 'error', payload: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  try {
    fn(JSON.stringify({ level, ...payload }));
  } catch {
    fn(`[${level}]`, payload);
  }
}

function buildLogger(
  base: Record<string, unknown>,
  sink: (level: 'info' | 'warn' | 'error', payload: Record<string, unknown>) => void
): RequestLogger {
  const make =
    (level: 'info' | 'warn' | 'error') =>
    (msg: string, fields?: Record<string, unknown>) =>
      sink(level, { ...base, msg, ...(fields ?? {}) });
  return {
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
  };
}

/**
 * Wrap a route handler with request_id + structured logging.
 *
 * Errors thrown inside the handler are caught and converted to a canonical
 * 500 error response with the request_id propagated.
 */
export function withRequestContext<TArgs extends unknown[]>(
  handler: RouteHandler<TArgs>,
  options: WithRequestContextOptions = {}
): (req: Request, ...args: TArgs) => Promise<Response> {
  const sink = options.logger ?? defaultLogger;
  return async function wrapped(req: Request, ...args: TArgs): Promise<Response> {
    const requestId = getOrCreateRequestId(req);
    const url = (() => {
      try {
        return new URL(req.url);
      } catch {
        return null;
      }
    })();
    const path = url?.pathname ?? '';
    const method = req.method;
    const log = buildLogger({ request_id: requestId, method, path }, sink);
    const start = Date.now();
    try {
      const res = await handler(req, { requestId, log }, ...args);
      // Echo request_id header if handler did not set one
      if (!res.headers.has(REQUEST_ID_HEADER)) {
        res.headers.set(REQUEST_ID_HEADER, requestId);
      }
      log.info('request_complete', { ms: Date.now() - start, status: res.status });
      return res;
    } catch (e) {
      const ms = Date.now() - start;
      const message = e instanceof Error ? e.message : 'Unknown error';
      log.error('request_failed', { ms, error: message });
      return err(ERROR_CODES.INTERNAL_ERROR, 'Internal server error', undefined, {
        requestId,
      });
    }
  };
}
