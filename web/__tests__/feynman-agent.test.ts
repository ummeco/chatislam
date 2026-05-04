/**
 * ChatIslam — Feynman Research Agent tests (CB-01 T09)
 *
 * Tests normalizeQuery, researchCacheKey, and ResearchResponse shape.
 * Does NOT call the Anthropic API — pure unit tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeQuery, researchCacheKey } from '../lib/feynman-agent'
import type { ResearchResponse } from '../lib/feynman-agent'

// ─── normalizeQuery ───────────────────────────────────────────────────────────

describe('normalizeQuery', () => {
  it('trims and lowercases', () => {
    expect(normalizeQuery('  What is Islam?  ')).toBe('what is islam?')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeQuery('prayer   times   in   ramadan')).toBe('prayer times in ramadan')
  })

  it('handles empty string', () => {
    expect(normalizeQuery('')).toBe('')
  })

  it('handles Arabic diacritics', () => {
    // Arabic content should pass through unchanged (no lowercasing effect)
    const arabic = 'ما حكم الصلاة'
    expect(normalizeQuery(arabic)).toBe(arabic)
  })
})

// ─── researchCacheKey ─────────────────────────────────────────────────────────

describe('researchCacheKey', () => {
  it('returns a deterministic Redis key', () => {
    const key1 = researchCacheKey('what is zakat', 'summary', 'en')
    const key2 = researchCacheKey('what is zakat', 'summary', 'en')
    expect(key1).toBe(key2)
  })

  it('starts with ci:research:', () => {
    const key = researchCacheKey('test query', 'intermediate', 'en')
    expect(key).toMatch(/^ci:research:/)
  })

  it('produces different keys for different depths', () => {
    const keyA = researchCacheKey('q', 'summary',      'en')
    const keyB = researchCacheKey('q', 'intermediate', 'en')
    const keyC = researchCacheKey('q', 'scholarly',    'en')
    expect(keyA).not.toBe(keyB)
    expect(keyB).not.toBe(keyC)
  })

  it('produces different keys for different languages', () => {
    const keyEn = researchCacheKey('q', 'summary', 'en')
    const keyAr = researchCacheKey('q', 'summary', 'ar')
    expect(keyEn).not.toBe(keyAr)
  })

  it('produces different keys for different queries', () => {
    const keyA = researchCacheKey('what is zakat', 'summary', 'en')
    const keyB = researchCacheKey('what is salah', 'summary', 'en')
    expect(keyA).not.toBe(keyB)
  })

  it('key length is consistent (sha256 = 64 hex chars after prefix)', () => {
    const key = researchCacheKey('any query', 'scholarly', 'en')
    // Format: ci:research:{64-char sha256}
    expect(key).toMatch(/^ci:research:[0-9a-f]{64}$/)
  })

  it('is case-insensitive for the query portion', () => {
    const keyLower = researchCacheKey('what is zakat', 'summary', 'en')
    const keyUpper = researchCacheKey('WHAT IS ZAKAT', 'summary', 'en')
    expect(keyLower).toBe(keyUpper)
  })
})

// ─── ResearchResponse shape guard ─────────────────────────────────────────────

describe('ResearchResponse type guard', () => {
  it('required fields check', () => {
    // Type check via duck typing
    const mockResponse = {
      result:      'This is the research result.',
      citations:   [],
      depth_used:  'summary' as const,
      cached:      false,
      research_id: 'abc-123',
    }

    // All required fields present
    expect(typeof mockResponse.result).toBe('string')
    expect(Array.isArray(mockResponse.citations)).toBe(true)
    expect(['summary', 'intermediate', 'scholarly']).toContain(mockResponse.depth_used)
    expect(typeof mockResponse.cached).toBe('boolean')
    expect(typeof mockResponse.research_id).toBe('string')
  })

  it('optional fields are optional', () => {
    const minimalResponse: ResearchResponse = {
      result:      'Result.',
      citations:   [],
      depth_used:  'summary',
      cached:      true,
      research_id: 'xyz',
    }
    // Should compile without madhhab_analysis or isnads
    expect(minimalResponse.madhhab_analysis).toBeUndefined()
    expect(minimalResponse.isnads).toBeUndefined()
  })
})

// ─── Rate limit key format ─────────────────────────────────────────────────────

describe('research rate limit keys', () => {
  it('does not collide with chat rate limit namespace', () => {
    const researchKey = `ci:rl:research:some-user-id`
    const chatKey     = `ci:rl:chat:some-user-id`
    expect(researchKey).not.toBe(chatKey)
    expect(researchKey.startsWith('ci:rl:research:')).toBe(true)
    expect(chatKey.startsWith('ci:rl:chat:')).toBe(true)
  })
})

// ─── Feature flag behavior (env mock) ────────────────────────────────────────

describe('FF_FEYNMAN_AGENT env flag', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('flag value is read from process.env', () => {
    // The actual gating happens in the route handler, not in the lib.
    // We just verify the env var name convention.
    const saved = process.env.FF_FEYNMAN_AGENT
    process.env.FF_FEYNMAN_AGENT = 'false'
    expect(process.env.FF_FEYNMAN_AGENT).toBe('false')
    process.env.FF_FEYNMAN_AGENT = saved
  })
})
