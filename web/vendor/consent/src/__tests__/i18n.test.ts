/**
 * S-C-S05-T03 — Tests for the consent i18n resolver.
 */

import { describe, expect, it } from 'vitest'
import { getMessages, isRtlLocale } from '../i18n.js'

describe('getMessages', () => {
  it('returns EN strings for "en"', () => {
    const m = getMessages('en')
    expect(m.banner.title).toBe('We use cookies')
    expect(m.preferences.title).toBe('Cookie Preferences')
  })

  it('returns AR strings for "ar"', () => {
    const m = getMessages('ar')
    expect(m.banner.title).toContain('ملفات تعريف الارتباط')
    expect(m.preferences.alwaysOn).toBe('مفعّل دائماً')
  })

  it('falls back to EN for unknown locale', () => {
    const m = getMessages('zz')
    expect(m.banner.title).toBe('We use cookies')
  })

  it('handles locale tags like en-US', () => {
    const m = getMessages('en-US')
    expect(m.banner.title).toBe('We use cookies')
  })

  it('returns scaffold (EN copy) for id/ur/bn', () => {
    expect(getMessages('id').banner.title).toBe('We use cookies')
    expect(getMessages('ur').banner.title).toBe('We use cookies')
    expect(getMessages('bn').banner.title).toBe('We use cookies')
  })
})

describe('isRtlLocale', () => {
  it('detects Arabic as RTL', () => {
    expect(isRtlLocale('ar')).toBe(true)
    expect(isRtlLocale('ar-SA')).toBe(true)
  })

  it('detects Urdu, Farsi, Hebrew as RTL', () => {
    expect(isRtlLocale('ur')).toBe(true)
    expect(isRtlLocale('fa')).toBe(true)
    expect(isRtlLocale('he')).toBe(true)
  })

  it('returns false for LTR locales', () => {
    expect(isRtlLocale('en')).toBe(false)
    expect(isRtlLocale('id')).toBe(false)
    expect(isRtlLocale('bn')).toBe(false)
  })
})
