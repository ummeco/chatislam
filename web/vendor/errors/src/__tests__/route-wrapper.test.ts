/**
 * @ummat/errors withErrorBoundary route wrapper tests
 */

import { describe, it, expect, vi } from 'vitest';
import { withErrorBoundary } from '../route-wrapper';
import { ErrorCode } from '../error';

describe('withErrorBoundary route wrapper', () => {
  it('wraps successful handler result', async () => {
    const handler = vi.fn(async () => ({ id: 123 }));
    const wrapped = withErrorBoundary(handler);
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    const result = await wrapped(req);

    expect(result).toEqual({ ok: true, value: { id: 123 } });
  });

  it('catches thrown error and returns error result', async () => {
    const error = new Error('test error');
    const handler = vi.fn(async () => {
      throw error;
    });
    const wrapped = withErrorBoundary(handler);
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    const result = await wrapped(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INTERNAL);
      expect(result.error.cause).toBe(error);
    }
  });

  it('catches unknown thrown value', async () => {
    const handler = vi.fn(async () => {
      throw 'raw string error';
    });
    const wrapped = withErrorBoundary(handler);
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    const result = await wrapped(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INTERNAL);
    }
  });

  it('calls onError callback when error is caught', async () => {
    const onError = vi.fn();
    const error = new Error('test error');
    const handler = vi.fn(async () => {
      throw error;
    });
    const wrapped = withErrorBoundary(handler, { onError });
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    await wrapped(req);

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0]?.[0].code).toBe(ErrorCode.INTERNAL);
  });

  it('handles onError callback exceptions gracefully', async () => {
    const onError = vi.fn().mockRejectedValue(new Error('callback error'));
    const handler = vi.fn(async () => {
      throw new Error('handler error');
    });
    const wrapped = withErrorBoundary(handler, { onError });
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    // Should not throw, and should still return error result
    const result = await wrapped(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INTERNAL);
    }
  });

  it('passes through Result from handler', async () => {
    const handler = vi.fn(async () => ({
      ok: true,
      value: { data: 'test' },
    }));
    const wrapped = withErrorBoundary(handler);
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    const result = await wrapped(req);

    expect(result).toEqual({
      ok: true,
      value: { data: 'test' },
    });
  });

  it('returns error result on thrown error with context', async () => {
    const handler = vi.fn(async () => {
      throw new Error('db failed');
    });
    const wrapped = withErrorBoundary(handler);
    const req = new Request('http://localhost/api/test', { method: 'GET' });

    const result = await wrapped(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INTERNAL);
      expect(result.error.message).toBe('An unexpected error occurred');
    }
  });
});
