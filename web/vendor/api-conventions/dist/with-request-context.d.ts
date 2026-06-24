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
export type RequestLogger = {
    info: (msg: string, fields?: Record<string, unknown>) => void;
    warn: (msg: string, fields?: Record<string, unknown>) => void;
    error: (msg: string, fields?: Record<string, unknown>) => void;
};
export type RequestContext = {
    requestId: string;
    log: RequestLogger;
};
export type RouteHandler<TArgs extends unknown[]> = (req: Request, ctx: RequestContext, ...args: TArgs) => Promise<Response> | Response;
export type WithRequestContextOptions = {
    /**
     * Optional sink for structured logs. Default: console with JSON-line output.
     * Replace with Sentry breadcrumb / Pino / etc. in production wiring.
     */
    logger?: (level: 'info' | 'warn' | 'error', payload: Record<string, unknown>) => void;
};
/**
 * Wrap a route handler with request_id + structured logging.
 *
 * Errors thrown inside the handler are caught and converted to a canonical
 * 500 error response with the request_id propagated.
 */
export declare function withRequestContext<TArgs extends unknown[]>(handler: RouteHandler<TArgs>, options?: WithRequestContextOptions): (req: Request, ...args: TArgs) => Promise<Response>;
//# sourceMappingURL=with-request-context.d.ts.map