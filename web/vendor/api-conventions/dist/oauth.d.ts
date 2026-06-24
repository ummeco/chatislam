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
/**
 * RFC 6749 §5.2 error codes for the token endpoint.
 */
export type OAuthError = 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' | 'access_denied' | 'server_error' | 'temporarily_unavailable';
export type OAuthErrorBody = {
    error: OAuthError;
    error_description?: string;
    error_uri?: string;
};
/**
 * Build an RFC 6749 §5.2 conformant error response.
 *
 * For invalid_client failures the spec REQUIRES the response to include a
 * `WWW-Authenticate: Basic` header when client auth used HTTP Basic — callers
 * can pass that via init.headers.
 */
export declare function errOAuth(error: OAuthError, errorDescription?: string, init?: {
    requestId?: string;
    status?: number;
    errorUri?: string;
    headers?: Record<string, string>;
}): Response;
//# sourceMappingURL=oauth.d.ts.map