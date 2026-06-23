/**
 * @ummat/errors UmmatError + ErrorCode tests
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  createError,
  toUmmatError,
  errorCodeToStatus,
  type UmmatError,
} from '../error';

describe('ErrorCode enum', () => {
  it('has all 7 canonical error codes', () => {
    expect(Object.values(ErrorCode)).toHaveLength(7);
    expect(Object.values(ErrorCode)).toContain(ErrorCode.NETWORK_OFFLINE);
    expect(Object.values(ErrorCode)).toContain(ErrorCode.PERMISSION_DENIED);
    expect(Object.values(ErrorCode)).toContain(ErrorCode.RATE_LIMITED);
    expect(Object.values(ErrorCode)).toContain(ErrorCode.NOT_FOUND);
    expect(Object.values(ErrorCode)).toContain(ErrorCode.VALIDATION);
    expect(Object.values(ErrorCode)).toContain(ErrorCode.INTERNAL);
    expect(Object.values(ErrorCode)).toContain(ErrorCode.THEOLOGY_GATE);
  });
});

describe('createError', () => {
  it('creates a basic error', () => {
    const error = createError(ErrorCode.NOT_FOUND, 'User not found');
    expect(error).toEqual({
      code: ErrorCode.NOT_FOUND,
      message: 'User not found',
    });
  });

  it('includes cause when provided', () => {
    const cause = new Error('db connection failed');
    const error = createError(ErrorCode.INTERNAL, 'Database error', { cause });
    expect(error.cause).toBe(cause);
  });

  it('includes context when provided', () => {
    const context = { userId: '123', requestId: 'abc' };
    const error = createError(ErrorCode.PERMISSION_DENIED, 'Access denied', { context });
    expect(error.context).toEqual(context);
  });

  it('includes status when provided', () => {
    const error = createError(ErrorCode.NOT_FOUND, 'Not found', { status: 404 });
    expect(error.status).toBe(404);
  });
});

describe('toUmmatError', () => {
  it('passes through existing UmmatError', () => {
    const original: UmmatError = {
      code: ErrorCode.VALIDATION,
      message: 'Invalid input',
    };
    const result = toUmmatError(original);
    expect(result).toBe(original);
  });

  it('wraps Error in INTERNAL', () => {
    const cause = new Error('db error');
    const result = toUmmatError(cause);
    expect(result.code).toBe(ErrorCode.INTERNAL);
    expect(result.cause).toBe(cause);
  });

  it('wraps unknown value in INTERNAL', () => {
    const result = toUmmatError({ random: 'object' });
    expect(result.code).toBe(ErrorCode.INTERNAL);
    expect(result.cause).toEqual({ random: 'object' });
  });

  it('wraps null in INTERNAL', () => {
    const result = toUmmatError(null);
    expect(result.code).toBe(ErrorCode.INTERNAL);
  });
});

describe('errorCodeToStatus', () => {
  it('maps NETWORK_OFFLINE to 503', () => {
    expect(errorCodeToStatus(ErrorCode.NETWORK_OFFLINE)).toBe(503);
  });

  it('maps PERMISSION_DENIED to 403', () => {
    expect(errorCodeToStatus(ErrorCode.PERMISSION_DENIED)).toBe(403);
  });

  it('maps RATE_LIMITED to 429', () => {
    expect(errorCodeToStatus(ErrorCode.RATE_LIMITED)).toBe(429);
  });

  it('maps NOT_FOUND to 404', () => {
    expect(errorCodeToStatus(ErrorCode.NOT_FOUND)).toBe(404);
  });

  it('maps VALIDATION to 422', () => {
    expect(errorCodeToStatus(ErrorCode.VALIDATION)).toBe(422);
  });

  it('maps INTERNAL to 500', () => {
    expect(errorCodeToStatus(ErrorCode.INTERNAL)).toBe(500);
  });

  it('maps THEOLOGY_GATE to 451', () => {
    expect(errorCodeToStatus(ErrorCode.THEOLOGY_GATE)).toBe(451);
  });
});
