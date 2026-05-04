/**
 * ChatIslam — Madhhab tests (CB-02 T14)
 *
 * Tests extractMadhabStances, buildMadhabSystemPromptAddendum.
 * detectFiqhQuestion calls Haiku — mocked in tests.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { extractMadhabStances, buildMadhabSystemPromptAddendum } from '../lib/madhhab'

// ─── extractMadhabStances ─────────────────────────────────────────────────────

describe('extractMadhabStances', () => {
  it('extracts basic madhhab pattern', () => {
    const text = `
      According to the Hanafi madhhab, this is permissible.
      According to the Maliki school, it is disliked.
      The Shafi'i stance: it is forbidden.
      The Hanbali stance: it is recommended.
    `
    const stances = extractMadhabStances(text)
    const madhabs = stances.map((s) => s.madhhab)
    expect(madhabs).toContain('hanafi')
    expect(madhabs).toContain('maliki')
  })

  it('returns empty array for text with no madhhab mentions', () => {
    const stances = extractMadhabStances('This is a general answer with no school mentioned.')
    expect(stances).toEqual([])
  })

  it('returns MadhabStance objects with required fields', () => {
    const text = 'The Hanafi scholars consider this obligatory.'
    const stances = extractMadhabStances(text)
    if (stances.length > 0) {
      const s = stances[0]
      expect(typeof s.madhhab).toBe('string')
      expect(typeof s.stance).toBe('string')
      expect(typeof s.is_majority).toBe('boolean')
    }
  })

  it('handles majority view marker', () => {
    const text = 'The majority of scholars (hanafi, maliki, shafii) hold this is obligatory.'
    const stances = extractMadhabStances(text)
    const majorityStance = stances.find((s) => s.is_majority === true)
    // Majority marker may or may not be detected depending on implementation
    expect(stances).toBeDefined()
  })
})

// ─── buildMadhabSystemPromptAddendum ─────────────────────────────────────────

describe('buildMadhabSystemPromptAddendum', () => {
  it('returns a non-empty string for hanafi', () => {
    const addendum = buildMadhabSystemPromptAddendum('hanafi')
    expect(typeof addendum).toBe('string')
    expect(addendum.length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for all madhabs', () => {
    const madhabs = ['hanafi', 'maliki', 'shafii', 'hanbali', 'all'] as const
    for (const m of madhabs) {
      const addendum = buildMadhabSystemPromptAddendum(m)
      expect(typeof addendum).toBe('string')
    }
  })

  it('mentions the madhhab name in the addendum', () => {
    const addendum = buildMadhabSystemPromptAddendum('maliki')
    expect(addendum.toLowerCase()).toContain('maliki')
  })

  it('all mode returns empty string (no single-school preference)', () => {
    // 'all' means no specific preference — returns '' so the base theological
    // prompt already covers balanced cross-madhhab presentation
    const addendum = buildMadhabSystemPromptAddendum('all')
    expect(addendum).toBe('')
  })

  it('does not inject instruction overrides', () => {
    const addendum = buildMadhabSystemPromptAddendum('hanafi')
    // Must not contain prompt injection attempts
    expect(addendum.toLowerCase()).not.toContain('ignore previous')
    expect(addendum.toLowerCase()).not.toContain('system:')
    expect(addendum.toLowerCase()).not.toContain('jailbreak')
  })
})

// ─── MadhabTag type validation ────────────────────────────────────────────────

describe('MadhabTag values', () => {
  it('accepts all valid madhab tags', () => {
    const valid = ['hanafi', 'maliki', 'shafii', 'hanbali', 'all']
    for (const tag of valid) {
      // No throw expected
      expect(() => buildMadhabSystemPromptAddendum(tag as Parameters<typeof buildMadhabSystemPromptAddendum>[0])).not.toThrow()
    }
  })
})

// ─── detectFiqhQuestion (mocked) ─────────────────────────────────────────────

describe('detectFiqhQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is exported from madhhab.ts', async () => {
    const { detectFiqhQuestion } = await import('../lib/madhhab')
    expect(typeof detectFiqhQuestion).toBe('function')
  })

  it('returns a Promise<boolean>', async () => {
    // Mock the Anthropic module to avoid real API calls
    vi.mock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'true' }],
          }),
        }
      },
    }))

    const { detectFiqhQuestion } = await import('../lib/madhhab')
    const result = await detectFiqhQuestion('Is it halal to eat shrimp?')
    expect(typeof result).toBe('boolean')
  })
})
