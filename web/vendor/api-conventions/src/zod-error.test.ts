import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatZodPath, zodError, zodErrorToDetails } from './zod-error.js';

const RID = '01900000-0000-7000-8000-0000000000aa';

describe('formatZodPath()', () => {
  it('returns empty string for empty path', () => {
    expect(formatZodPath([])).toBe('');
  });
  it('joins object keys with dots', () => {
    expect(formatZodPath(['user', 'email'])).toBe('user.email');
  });
  it('brackets array indices', () => {
    expect(formatZodPath(['items', 0, 'sku'])).toBe('items[0].sku');
  });
  it('handles top-level array index', () => {
    expect(formatZodPath([0, 'foo'])).toBe('[0].foo');
  });
  it('handles single key', () => {
    expect(formatZodPath(['name'])).toBe('name');
  });
});

describe('zodErrorToDetails()', () => {
  it('case 1: single-field error', () => {
    const Schema = z.object({ name: z.string() });
    const r = Schema.safeParse({ name: 123 });
    expect(r.success).toBe(false);
    if (r.success) return;
    const d = zodErrorToDetails(r.error);
    expect(Object.keys(d.fieldErrors)).toContain('name');
    expect(d.fieldErrors.name?.length).toBeGreaterThan(0);
    expect(d.formErrors).toEqual([]);
  });

  it('case 2: multi-field error', () => {
    const Schema = z.object({ a: z.string(), b: z.number() });
    const r = Schema.safeParse({ a: 1, b: 'x' });
    if (r.success) throw new Error('expected failure');
    const d = zodErrorToDetails(r.error);
    expect(Object.keys(d.fieldErrors).sort()).toEqual(['a', 'b']);
  });

  it('case 3: nested object error', () => {
    const Schema = z.object({ user: z.object({ email: z.string().email() }) });
    const r = Schema.safeParse({ user: { email: 'not-email' } });
    if (r.success) throw new Error('expected failure');
    const d = zodErrorToDetails(r.error);
    expect(Object.keys(d.fieldErrors)).toContain('user.email');
  });

  it('case 4: array element error uses bracket notation', () => {
    const Schema = z.object({ items: z.array(z.object({ sku: z.string() })) });
    const r = Schema.safeParse({ items: [{ sku: 'ok' }, { sku: 5 }] });
    if (r.success) throw new Error('expected failure');
    const d = zodErrorToDetails(r.error);
    expect(Object.keys(d.fieldErrors)).toContain('items[1].sku');
  });

  it('case 5: refine() failure surfaces at the refined path', () => {
    const Schema = z
      .object({ password: z.string(), confirm: z.string() })
      .refine((v) => v.password === v.confirm, {
        message: 'passwords must match',
        path: ['confirm'],
      });
    const r = Schema.safeParse({ password: 'a', confirm: 'b' });
    if (r.success) throw new Error('expected failure');
    const d = zodErrorToDetails(r.error);
    expect(d.fieldErrors.confirm).toContain('passwords must match');
  });

  it('case 6: transform-then-validate failure (parse-time error)', () => {
    const Schema = z.object({
      n: z
        .string()
        .transform((s) => Number(s))
        .pipe(z.number().int().min(1)),
    });
    const r = Schema.safeParse({ n: '0' });
    if (r.success) throw new Error('expected failure');
    const d = zodErrorToDetails(r.error);
    expect(Object.keys(d.fieldErrors)).toContain('n');
  });
});

describe('zodError()', () => {
  it('produces a 422 with VALIDATION_FAILED code and details', async () => {
    const Schema = z.object({ name: z.string() });
    const r = Schema.safeParse({ name: 1 });
    if (r.success) throw new Error('expected failure');
    const res = zodError(r.error, { requestId: RID });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.request_id).toBe(RID);
    expect(body.error.details.fieldErrors.name).toBeDefined();
  });
});
