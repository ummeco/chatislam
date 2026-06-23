import { describe, expect, it } from 'vitest';
import {
  generateRequestId,
  getOrCreateRequestId,
  isValidRequestId,
  REQUEST_ID_HEADER,
} from './request-id.js';

describe('isValidRequestId()', () => {
  it('accepts a generated UUIDv7', () => {
    expect(isValidRequestId(generateRequestId())).toBe(true);
  });
  it('accepts a UUIDv4', () => {
    expect(isValidRequestId('a1b2c3d4-1234-4abc-9def-0123456789ab')).toBe(true);
  });
  it('rejects empty string', () => {
    expect(isValidRequestId('')).toBe(false);
  });
  it('rejects non-string', () => {
    expect(isValidRequestId(undefined)).toBe(false);
    expect(isValidRequestId(null)).toBe(false);
    expect(isValidRequestId(123)).toBe(false);
  });
  it('rejects malformed', () => {
    expect(isValidRequestId('not-a-uuid')).toBe(false);
    expect(isValidRequestId('a1b2c3d4-1234-4abc-9def-XXXXXXXXXXXX')).toBe(false);
  });
});

describe('generateRequestId()', () => {
  it('produces unique values', () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(a).not.toBe(b);
    expect(isValidRequestId(a)).toBe(true);
    expect(isValidRequestId(b)).toBe(true);
  });
});

describe('getOrCreateRequestId()', () => {
  const RID = '01900000-0000-7000-8000-0000000000bb';

  it('reads from Request header', () => {
    const req = new Request('https://example.com/x', {
      headers: { [REQUEST_ID_HEADER]: RID },
    });
    expect(getOrCreateRequestId(req)).toBe(RID);
  });

  it('reads from lower-case header', () => {
    const req = new Request('https://example.com/x', {
      headers: { 'x-request-id': RID },
    });
    expect(getOrCreateRequestId(req)).toBe(RID);
  });

  it('generates fresh id when missing', () => {
    const req = new Request('https://example.com/x');
    const id = getOrCreateRequestId(req);
    expect(isValidRequestId(id)).toBe(true);
  });

  it('regenerates when header is invalid', () => {
    const req = new Request('https://example.com/x', {
      headers: { [REQUEST_ID_HEADER]: 'garbage' },
    });
    const id = getOrCreateRequestId(req);
    expect(id).not.toBe('garbage');
    expect(isValidRequestId(id)).toBe(true);
  });

  it('reads from Headers instance', () => {
    const h = new Headers({ [REQUEST_ID_HEADER]: RID });
    expect(getOrCreateRequestId(h)).toBe(RID);
  });

  it('reads from plain record', () => {
    expect(getOrCreateRequestId({ [REQUEST_ID_HEADER]: RID })).toBe(RID);
    expect(getOrCreateRequestId({ 'x-request-id': RID })).toBe(RID);
  });
});
