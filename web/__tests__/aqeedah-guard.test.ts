/**
 * SCI-21 — aqeedah-guard.ts tests
 * Covers: Ahmadiyya hard_block, Nation of Islam hard_block, Shia soft_flag, allow pass-through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logModerationEvent so tests don't make network calls
vi.mock('../lib/moderation', () => ({
  logModerationEvent: vi.fn().mockResolvedValue(undefined),
  hashMessage:        (msg: string) => `hash:${msg.slice(0, 8)}`,
}))

import { detectAqeedahBoundaryProbe, SHIA_SOFT_FLAG_ADDENDUM } from '../lib/aqeedah-guard'

describe('detectAqeedahBoundaryProbe — hard_block (Ahmadiyya)', () => {
  it('blocks "ahmadi" references', async () => {
    const result = await detectAqeedahBoundaryProbe('What does the ahmadi faith teach?', null)
    expect(result.action).toBe('hard_block')
    if (result.action === 'hard_block') {
      expect(result.sect).toBe('ahmadiyya')
      expect(result.message).toBeTruthy()
    }
  })

  it('blocks "Ahmadiyya" (case-insensitive)', async () => {
    const result = await detectAqeedahBoundaryProbe('Tell me about Ahmadiyya', null)
    expect(result.action).toBe('hard_block')
  })

  it('blocks "qadiani"', async () => {
    const result = await detectAqeedahBoundaryProbe('Are Qadiani people Muslim?', null)
    expect(result.action).toBe('hard_block')
    if (result.action === 'hard_block') expect(result.sect).toBe('ahmadiyya')
  })

  it('blocks "Mirza Ghulam Ahmad"', async () => {
    const result = await detectAqeedahBoundaryProbe('Who was Mirza Ghulam Ahmad?', null)
    expect(result.action).toBe('hard_block')
  })
})

describe('detectAqeedahBoundaryProbe — hard_block (Nation of Islam)', () => {
  it('blocks "Nation of Islam"', async () => {
    const result = await detectAqeedahBoundaryProbe('What does the Nation of Islam believe?', null)
    expect(result.action).toBe('hard_block')
    if (result.action === 'hard_block') expect(result.sect).toBe('nation_of_islam')
  })

  it('blocks "Louis Farrakhan"', async () => {
    const result = await detectAqeedahBoundaryProbe('Is Louis Farrakhan Muslim?', null)
    expect(result.action).toBe('hard_block')
  })
})

describe('detectAqeedahBoundaryProbe — soft_flag (Shia)', () => {
  it('soft-flags "shia" queries', async () => {
    const result = await detectAqeedahBoundaryProbe('What is the Shia view on prayer?', null)
    expect(result.action).toBe('soft_flag')
    if (result.action === 'soft_flag') expect(result.sect).toBe('shia')
  })

  it('soft-flags "shi\'a"', async () => {
    const result = await detectAqeedahBoundaryProbe("Tell me about Shi'a Islam", null)
    expect(result.action).toBe('soft_flag')
  })

  it('soft-flags muta marriage queries', async () => {
    const result = await detectAqeedahBoundaryProbe('Is muta marriage permissible?', null)
    expect(result.action).toBe('soft_flag')
  })
})

describe('detectAqeedahBoundaryProbe — allow', () => {
  it('allows mainstream Islamic questions', async () => {
    const result = await detectAqeedahBoundaryProbe('What is the ruling on fasting?', null)
    expect(result.action).toBe('allow')
  })

  it('allows questions about the four madhabs', async () => {
    const result = await detectAqeedahBoundaryProbe('What does the Hanbali madhab say about zakah?', null)
    expect(result.action).toBe('allow')
  })

  it('allows Quran questions', async () => {
    const result = await detectAqeedahBoundaryProbe('What is the meaning of Surah Al-Fatiha?', null)
    expect(result.action).toBe('allow')
  })

  it('allows Arabic greetings', async () => {
    const result = await detectAqeedahBoundaryProbe('Assalamu alaikum, I have a question.', null)
    expect(result.action).toBe('allow')
  })
})

describe('SHIA_SOFT_FLAG_ADDENDUM', () => {
  it('is a non-empty string', () => {
    expect(typeof SHIA_SOFT_FLAG_ADDENDUM).toBe('string')
    expect(SHIA_SOFT_FLAG_ADDENDUM.length).toBeGreaterThan(50)
  })

  it('references Sunni scholarly position', () => {
    expect(SHIA_SOFT_FLAG_ADDENDUM.toLowerCase()).toContain('sunni')
  })
})
