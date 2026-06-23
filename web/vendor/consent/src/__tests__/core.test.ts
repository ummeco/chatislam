import { describe, it, expect } from 'vitest'
import {
  buildAcceptAllRecord,
  buildRejectNonEssentialRecord,
  buildConsentRecord,
  shouldRePrompt,
  isValidConsentRecord,
  parseConsentJson,
  serializeConsent,
  CURRENT_CONSENT_VERSION,
} from '../core/storage-pure.js'

describe('@ummat/consent/core — pure storage primitives', () => {
  it('buildAcceptAllRecord opts everyone in and is explicit', () => {
    const r = buildAcceptAllRecord()
    expect(r.categories.analytics).toBe(true)
    expect(r.categories.marketing).toBe(true)
    expect(r.categories.functional).toBe(true)
    expect(r.explicit).toBe(true)
    expect(r.version).toBe(CURRENT_CONSENT_VERSION)
  })

  it('buildRejectNonEssentialRecord opts everyone out', () => {
    const r = buildRejectNonEssentialRecord()
    expect(r.categories.analytics).toBe(false)
    expect(r.categories.marketing).toBe(false)
    expect(r.categories.functional).toBe(false)
    expect(r.explicit).toBe(true)
  })

  it('shouldRePrompt returns true on null', () => {
    expect(shouldRePrompt(null)).toBe(true)
  })

  it('shouldRePrompt returns false on a current-version record', () => {
    const r = buildAcceptAllRecord()
    expect(shouldRePrompt(r)).toBe(false)
  })

  it('isValidConsentRecord rejects malformed shapes', () => {
    expect(isValidConsentRecord(null)).toBe(false)
    expect(isValidConsentRecord({})).toBe(false)
    expect(isValidConsentRecord({ version: 'x' })).toBe(false)
  })

  it('parseConsentJson round-trips through serializeConsent', () => {
    const r = buildConsentRecord({ analytics: true, marketing: false, functional: true })
    const raw = serializeConsent(r)
    const parsed = parseConsentJson(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.categories.analytics).toBe(true)
    expect(parsed?.categories.marketing).toBe(false)
  })

  it('parseConsentJson returns null on malformed JSON', () => {
    expect(parseConsentJson('not json')).toBeNull()
  })

  it('parseConsentJson returns null on null', () => {
    expect(parseConsentJson(null)).toBeNull()
  })
})
