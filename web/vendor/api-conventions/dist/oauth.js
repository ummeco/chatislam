/**
 * OAuth 2.0 (RFC 6749 §5.2) conformant error response.
 *
 * RFC 6749 §5.2 specifies the JSON shape for OAuth token endpoint errors:
 *   {
 *     "error": "invalid_request",
 *     "error_description": "...",
 *     "error_uri": "..."
 *   }
 *
 * This shape MUST NOT be wrapped in our canonical { error: { code, message, ... } }
 * envelope, or RFC-conformant clients will fail to parse. T03a (oauth/* migration)
 * uses these helpers; all other routes use err()/ok() from ./responses.
 */
import { REQUEST_ID_HEADER } from './status-codes.js';
const STATUS_FOR_OAUTH_ERROR = Object.freeze({
    invalid_request: 400,
    invalid_client: 401,
    invalid_grant: 400,
    unauthorized_client: 400,
    unsupported_grant_type: 400,
    invalid_scope: 400,
    access_denied: 403,
    server_error: 500,
    temporarily_unavailable: 503,
});
/**
 * Build an RFC 6749 §5.2 conformant error response.
 *
 * For invalid_client failures the spec REQUIRES the response to include a
 * `WWW-Authenticate: Basic` header when client auth used HTTP Basic — callers
 * can pass that via init.headers.
 */
export function errOAuth(error, errorDescription, init = {}) {
    const body = { error };
    if (errorDescription)
        body.error_description = errorDescription;
    if (init.errorUri)
        body.error_uri = init.errorUri;
    const headers = new Headers({
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        pragma: 'no-cache',
    });
    if (init.requestId)
        headers.set(REQUEST_ID_HEADER, init.requestId);
    if (init.headers) {
        for (const [k, v] of Object.entries(init.headers))
            headers.set(k, v);
    }
    return new Response(JSON.stringify(body), {
        status: init.status ?? STATUS_FOR_OAUTH_ERROR[error],
        headers,
    });
}
//# sourceMappingURL=oauth.js.map