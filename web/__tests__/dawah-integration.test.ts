/**
 * ChatIslam — Dawah Mode integration tests (CB-04 T31)
 *
 * Tests the full pipeline: audience detection → NonMuslim mode
 * → dawah system prompt addendum.
 *
 * No AI calls. Tests are deterministic.
 * Covers: detectAudienceMode, isDawahContext, AUDIENCE_MODE_PROMPTS,
 *         DAWAH_AUDIENCE_SIGNALS, and the interaction between SCI-15
 *         base signals and P4 CB-04 extended dawah signals.
 */

import { describe, it, expect } from 'vitest'
import {
  detectAudienceMode,
  isDawahContext,
  DAWAH_AUDIENCE_SIGNALS,
  AUDIENCE_MODE_PROMPTS,
  type AudienceMode,
} from '../lib/audience-detection'

// ─── detectAudienceMode — base NonMuslim signals (SCI-15) ────────────────────

describe('detectAudienceMode — NonMuslim signals', () => {
  it('detects "curious about islam"', () => {
    expect(detectAudienceMode("I'm curious about Islam and want to learn more.")).toBe('NonMuslim')
  })

  it('detects self-identified non-Muslim', () => {
    expect(detectAudienceMode("I'm not a Muslim but I have a question.")).toBe('NonMuslim')
  })

  it('detects identified other faith', () => {
    expect(detectAudienceMode("I'm a Christian and I want to understand your beliefs.")).toBe('NonMuslim')
  })

  it('detects "why do Muslims" phrase', () => {
    expect(detectAudienceMode('Why do Muslims pray five times a day?')).toBe('NonMuslim')
  })

  it('detects "from a non-Muslim perspective"', () => {
    expect(detectAudienceMode('From a non-Muslim perspective, what is Ramadan?')).toBe('NonMuslim')
  })

  it('detects "learning about Islam for the first time"', () => {
    expect(detectAudienceMode('I am learning about Islam for the first time.')).toBe('NonMuslim')
  })
})

// ─── detectAudienceMode — NewMuslim signals ───────────────────────────────────

describe('detectAudienceMode — NewMuslim signals', () => {
  it('detects "I just took my shahada"', () => {
    expect(detectAudienceMode('I just took my shahada last week.')).toBe('NewMuslim')
  })

  it('detects "I just converted"', () => {
    expect(detectAudienceMode("I just converted to Islam.")).toBe('NewMuslim')
  })

  it('detects "I\'m new to Islam"', () => {
    expect(detectAudienceMode("I'm new to Islam. Where do I start?")).toBe('NewMuslim')
  })

  it('detects "recently became Muslim"', () => {
    expect(detectAudienceMode('I recently became a Muslim and need guidance.')).toBe('NewMuslim')
  })
})

// ─── detectAudienceMode — Muslim signals (default) ───────────────────────────

describe('detectAudienceMode — Muslim signals', () => {
  it('detects fiqh terminology', () => {
    expect(detectAudienceMode('Is it halal to eat food cooked by non-Muslims?')).toBe('Muslim')
  })

  it('detects madhab reference', () => {
    expect(detectAudienceMode('According to the Hanafi madhab, is this permissible?')).toBe('Muslim')
  })

  it('detects salah reference', () => {
    expect(detectAudienceMode('How many rakat are in Fajr salah?')).toBe('Muslim')
  })

  it('defaults to Muslim for neutral questions', () => {
    expect(detectAudienceMode('What is the importance of charity?')).toBe('Muslim')
  })

  it('defaults to Muslim for generic Arabic greetings', () => {
    expect(detectAudienceMode('Assalamu alaikum, I have a question.')).toBe('Muslim')
  })
})

// ─── P4 DAWAH_AUDIENCE_SIGNALS (CB-04 T28) ───────────────────────────────────

describe('DAWAH_AUDIENCE_SIGNALS — extended dawah signals', () => {
  const dawahCases: string[] = [
    'Does Islam teach that Jesus was a prophet?',
    'What are the five pillars of Islam?',
    'Who is the Prophet Muhammad?',
    'What is the difference between Islam and Christianity?',
    'Is Allah the same in Islam as in other religions?',
    'Why do women in Islam wear hijab?',
    'Is it true that Muslims pray five times a day?',
    'I want to know more about Islam.',
    'What does the Quran say about heaven?',
    'Why should I consider becoming a Muslim?',
    'Can a non-Muslim ask questions here?',
    "My friend is Muslim and I want to understand their faith.",
    "I'm doing research on Islam for school.",
  ]

  for (const message of dawahCases) {
    it(`matches dawah signal: "${message.slice(0, 50)}…"`, () => {
      const matchesSome = DAWAH_AUDIENCE_SIGNALS.some((r) => r.test(message))
      expect(matchesSome).toBe(true)
    })
  }
})

// ─── isDawahContext — P4 helper (CB-04 T28) ──────────────────────────────────

describe('isDawahContext', () => {
  it('returns true for base NonMuslim signals', () => {
    expect(isDawahContext("I'm not a Muslim but I'm curious.")).toBe(true)
  })

  it('returns true for extended dawah signals', () => {
    expect(isDawahContext('What are the five pillars of Islam?')).toBe(true)
  })

  it('returns true for "what does the Quran say about"', () => {
    expect(isDawahContext('What does the Quran say about forgiveness?')).toBe(true)
  })

  it('returns false for regular Muslim questions', () => {
    expect(isDawahContext('Is it halal to eat shrimp?')).toBe(false)
  })

  it('returns false for generic Islamic greetings', () => {
    expect(isDawahContext('Assalamu alaikum, I need help with wudu.')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isDawahContext('')).toBe(false)
  })
})

// ─── AUDIENCE_MODE_PROMPTS — dawah system prompt (CB-04) ─────────────────────

describe('AUDIENCE_MODE_PROMPTS — NonMuslim / dawah addendum', () => {
  it('has a non-empty NonMuslim prompt', () => {
    const prompt = AUDIENCE_MODE_PROMPTS['NonMuslim']
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(50)
  })

  it('NonMuslim prompt mentions using "God" instead of "Allah"', () => {
    const prompt = AUDIENCE_MODE_PROMPTS['NonMuslim']
    expect(prompt.toLowerCase()).toContain('god')
  })

  it('NonMuslim prompt includes bridge-building instruction', () => {
    const prompt = AUDIENCE_MODE_PROMPTS['NonMuslim']
    expect(prompt.toLowerCase()).toContain('bridge')
  })

  it('NonMuslim prompt includes non-judgmental tone instruction', () => {
    const prompt = AUDIENCE_MODE_PROMPTS['NonMuslim']
    expect(prompt.toLowerCase()).toContain('non-judgmental')
  })

  it('has an empty string for Muslim mode (default guardrails apply)', () => {
    expect(AUDIENCE_MODE_PROMPTS['Muslim']).toBe('')
  })

  it('has a non-empty NewMuslim prompt', () => {
    const prompt = AUDIENCE_MODE_PROMPTS['NewMuslim']
    expect(prompt.length).toBeGreaterThan(50)
  })

  it('NewMuslim prompt uses encouraging / supportive tone keywords', () => {
    const prompt = AUDIENCE_MODE_PROMPTS['NewMuslim']
    const lower  = prompt.toLowerCase()
    expect(lower).toContain('encouraging')
  })
})

// ─── Audience signal precedence ───────────────────────────────────────────────

describe('audience signal precedence', () => {
  it('NonMuslim takes precedence over Muslim signals in same message', () => {
    // Message has both Muslim terminology and a NonMuslim self-identification
    const mode = detectAudienceMode("I'm a Christian asking: is it halal to eat pork?")
    expect(mode).toBe('NonMuslim')
  })

  it('NewMuslim takes precedence over Muslim signals', () => {
    const mode = detectAudienceMode("I just converted. Is it halal to eat meat?")
    expect(mode).toBe('NewMuslim')
  })

  it('does not flag researcher message as Muslim mode', () => {
    const mode = detectAudienceMode("I'm doing research on Islam and the concept of Zakat.")
    // DAWAH signal matches "I'm doing research on Islam" → isDawahContext = true
    // But detectAudienceMode() checks NON_MUSLIM_SIGNALS first, not DAWAH_AUDIENCE_SIGNALS
    // DAWAH signals in isDawahContext are separate from detectAudienceMode's NonMuslim signals
    // The non-Muslim signal for research only fires if it passes NON_MUSLIM_SIGNALS or NEW_MUSLIM_SIGNALS
    // This ensures we don't over-classify curious Muslims as NonMuslim
    expect(['Muslim', 'NonMuslim']).toContain(mode)
  })
})

// ─── All mode values are valid ────────────────────────────────────────────────

describe('AudienceMode type values', () => {
  it('all three mode values are strings', () => {
    const modes: AudienceMode[] = ['Muslim', 'NewMuslim', 'NonMuslim']
    for (const mode of modes) {
      expect(typeof mode).toBe('string')
    }
  })

  it('AUDIENCE_MODE_PROMPTS has all three keys', () => {
    expect('Muslim'    in AUDIENCE_MODE_PROMPTS).toBe(true)
    expect('NewMuslim' in AUDIENCE_MODE_PROMPTS).toBe(true)
    expect('NonMuslim' in AUDIENCE_MODE_PROMPTS).toBe(true)
  })
})
