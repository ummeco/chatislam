import { describe, expect, it } from 'vitest';
import { ok } from './responses.js';
import { REQUEST_ID_HEADER } from './status-codes.js';
import { withRequestContext } from './with-request-context.js';

describe('withRequestContext()', () => {
  it('propagates request_id from incoming header to response', async () => {
    const RID = '01900000-0000-7000-8000-0000000000cc';
    const handler = withRequestContext(async (_req, ctx) => {
      return ok({ ok: true }, { requestId: ctx.requestId });
    });
    const res = await handler(
      new Request('https://x.test/api/health', { headers: { [REQUEST_ID_HEADER]: RID } })
    );
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(RID);
  });

  it('generates request_id when missing', async () => {
    const handler = withRequestContext(async (_req, ctx) => ok({ rid: ctx.requestId }));
    const res = await handler(new Request('https://x.test/api/x'));
    const id = res.headers.get(REQUEST_ID_HEADER);
    expect(id).toBeTruthy();
    expect(id?.length).toBe(36);
  });

  it('catches thrown errors and returns canonical 500', async () => {
    const handler = withRequestContext(async () => {
      throw new Error('boom');
    });
    const res = await handler(new Request('https://x.test/api/x'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.request_id.length).toBe(36);
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
  });

  it('logs request_complete with status', async () => {
    const lines: Array<{ level: string; payload: Record<string, unknown> }> = [];
    const handler = withRequestContext(async () => ok({}), {
      logger: (level, payload) => lines.push({ level, payload }),
    });
    await handler(new Request('https://x.test/api/x'));
    const complete = lines.find((l) => l.payload.msg === 'request_complete');
    expect(complete).toBeDefined();
    expect(complete?.payload.status).toBe(200);
  });
});
