import { describe, expect, it } from 'vitest';
import { ERROR_CODES, err, noContent, ok, paginate, redirect } from './responses.js';
import { REQUEST_ID_HEADER, STATUS } from './status-codes.js';

const RID = '01900000-0000-7000-8000-000000000001';

describe('ok()', () => {
  it('wraps data in { data } envelope with 200 default', async () => {
    const res = ok({ id: 1, name: 'Foo' }, { requestId: RID });
    expect(res.status).toBe(STATUS.OK);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(RID);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ data: { id: 1, name: 'Foo' } });
  });

  it('honors explicit status', async () => {
    const res = ok({ created: true }, { status: STATUS.CREATED, requestId: RID });
    expect(res.status).toBe(201);
  });

  it('emits no body for 204', async () => {
    const res = ok(null, { status: STATUS.NO_CONTENT, requestId: RID });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  });
});

describe('paginate()', () => {
  it('produces canonical list envelope', async () => {
    const res = paginate(
      [{ id: 1 }, { id: 2 }],
      { next_cursor: 'abc', has_more: true, total: 50 },
      { requestId: RID }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      pagination: { next_cursor: 'abc', has_more: true, total: 50 },
    });
  });
});

describe('err()', () => {
  it('maps known code to default status (VALIDATION_FAILED → 422)', async () => {
    const res = err(ERROR_CODES.VALIDATION_FAILED, 'bad', undefined, { requestId: RID });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.message).toBe('bad');
    expect(body.error.request_id).toBe(RID);
    expect(body.error.details).toBeUndefined();
  });

  it('maps NOT_FOUND → 404', async () => {
    const res = err(ERROR_CODES.NOT_FOUND, 'gone', undefined, { requestId: RID });
    expect(res.status).toBe(404);
  });

  it('maps RATE_LIMITED → 429', async () => {
    const res = err(ERROR_CODES.RATE_LIMITED, 'slow', undefined, { requestId: RID });
    expect(res.status).toBe(429);
  });

  it('includes details when provided', async () => {
    const res = err(
      ERROR_CODES.VALIDATION_FAILED,
      'bad',
      { fieldErrors: { name: ['required'] }, formErrors: [] },
      { requestId: RID }
    );
    const body = await res.json();
    expect(body.error.details).toEqual({
      fieldErrors: { name: ['required'] },
      formErrors: [],
    });
  });

  it('falls back to 500 for unknown code', async () => {
    const res = err('SOMETHING_NEW', 'oops', undefined, { requestId: RID });
    expect(res.status).toBe(500);
  });

  it('honors explicit status override', async () => {
    const res = err(ERROR_CODES.CONFLICT, 'taken', undefined, {
      status: STATUS.UNPROCESSABLE_ENTITY,
      requestId: RID,
    });
    expect(res.status).toBe(422);
  });
});

describe('noContent()', () => {
  it('returns 204 with request id header and no body', async () => {
    const res = noContent({ requestId: RID });
    expect(res.status).toBe(204);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(RID);
    expect(await res.text()).toBe('');
  });
});

describe('redirect()', () => {
  it('returns 308 with location header', async () => {
    const res = redirect('/api/healthz', { requestId: RID });
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('/api/healthz');
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(RID);
  });
});
