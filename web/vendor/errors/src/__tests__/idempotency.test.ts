/**
 * @ummat/errors generateIdempotencyKey tests
 */

import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey } from '../idempotency';

describe('generateIdempotencyKey', () => {
  it('returns a UUID v4 format string', () => {
    const key = generateIdempotencyKey();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(key).toMatch(uuidRegex);
  });

  it('returns a unique key on each call', () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    const key3 = generateIdempotencyKey();

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
    expect(key1).not.toBe(key3);
  });

  it('can be used in HTTP headers', () => {
    const key = generateIdempotencyKey();
    const headers = new Headers({
      'Idempotency-Key': key,
    });
    expect(headers.get('Idempotency-Key')).toBe(key);
  });
});
