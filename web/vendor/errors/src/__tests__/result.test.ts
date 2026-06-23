/**
 * @ummat/errors Result<T, E> tests
 */

import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, unwrap, map, foldAsync } from '../result';
import type { Result } from '../result';

describe('Result<T, E>', () => {
  describe('ok/err constructors', () => {
    it('constructs success results', () => {
      const result = ok(42);
      expect(result).toEqual({ ok: true, value: 42 });
    });

    it('constructs error results', () => {
      const error = { code: 'INTERNAL', message: 'boom' };
      const result = err(error);
      expect(result).toEqual({ ok: false, error });
    });
  });

  describe('type guards', () => {
    it('isOk detects success', () => {
      const success: Result<number> = ok(123);
      expect(isOk(success)).toBe(true);
    });

    it('isOk rejects error', () => {
      const failure: Result<number, string> = err('fail');
      expect(isOk(failure)).toBe(false);
    });

    it('isErr detects error', () => {
      const failure: Result<number, string> = err('fail');
      expect(isErr(failure)).toBe(true);
    });

    it('isErr rejects success', () => {
      const success: Result<number> = ok(123);
      expect(isErr(success)).toBe(false);
    });
  });

  describe('unwrap', () => {
    it('extracts value from success', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('throws on error', () => {
      const error = new Error('test');
      const result: Result<number, Error> = err(error);
      expect(() => unwrap(result)).toThrow('test');
    });
  });

  describe('map', () => {
    it('maps over success value', () => {
      const result = ok(5);
      const mapped = map(result, (x) => x * 2);
      expect(mapped).toEqual({ ok: true, value: 10 });
    });

    it('leaves error unchanged', () => {
      const error = 'fail';
      const result: Result<number, string> = err(error);
      const mapped = map(result, (x) => x * 2);
      expect(mapped).toEqual({ ok: false, error });
    });
  });

  describe('foldAsync', () => {
    it('applies onOk for success', async () => {
      const result = ok(5);
      const folded = await foldAsync(
        result,
        async (x) => x * 2,
        async () => 0
      );
      expect(folded).toBe(10);
    });

    it('applies onErr for error', async () => {
      const result: Result<number, string> = err('fail');
      const folded = await foldAsync(
        result,
        async (x) => x * 2,
        async () => -1
      );
      expect(folded).toBe(-1);
    });
  });
});
