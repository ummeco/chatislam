import { describe, expect, it } from 'vitest';
import { errOAuth } from './oauth.js';
import { REQUEST_ID_HEADER } from './status-codes.js';

const RID = '01900000-0000-7000-8000-0000000000dd';

describe('errOAuth()', () => {
  it('emits RFC 6749 §5.2 shape (no envelope wrap)', async () => {
    const res = errOAuth('invalid_request', 'missing grant_type', { requestId: RID });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'invalid_request', error_description: 'missing grant_type' });
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(RID);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('maps invalid_client → 401', () => {
    const res = errOAuth('invalid_client');
    expect(res.status).toBe(401);
  });

  it('maps server_error → 500', () => {
    const res = errOAuth('server_error');
    expect(res.status).toBe(500);
  });

  it('omits error_description when absent', async () => {
    const res = errOAuth('invalid_grant');
    const body = await res.json();
    expect(body.error).toBe('invalid_grant');
    expect(body.error_description).toBeUndefined();
  });

  it('honors explicit status override', () => {
    const res = errOAuth('invalid_request', undefined, { status: 422 });
    expect(res.status).toBe(422);
  });
});
