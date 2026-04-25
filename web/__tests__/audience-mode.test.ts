import { describe, it, expect } from 'vitest'
import { detectAudienceMode } from '../lib/audience-mode'

describe('detectAudienceMode', () => {
  describe('NonMuslim detection', () => {
    it('detects "I\'m not Muslim"', () => {
      expect(detectAudienceMode("I'm not Muslim but I have a question")).toBe('NonMuslim')
    })
    it('detects "Why do Muslims..."', () => {
      expect(detectAudienceMode('Why do Muslims pray 5 times a day?')).toBe('NonMuslim')
    })
    it('detects skeptical framing', () => {
      expect(detectAudienceMode("What do you people believe about Jesus?")).toBe('NonMuslim')
    })
  })

  describe('NewMuslim detection', () => {
    it('detects shahada framing', () => {
      expect(detectAudienceMode('I just took my shahada last week')).toBe('NewMuslim')
    })
    it('detects "I recently converted"', () => {
      expect(detectAudienceMode('I recently converted to Islam')).toBe('NewMuslim')
    })
    it('detects "I\'m new to Islam"', () => {
      expect(detectAudienceMode("I'm new to Islam, how do I pray?")).toBe('NewMuslim')
    })
  })

  describe('Muslim detection', () => {
    it('detects Islamic terminology', () => {
      expect(detectAudienceMode('Is it permissible to combine salah when travelling?')).toBe('Muslim')
    })
    it('detects ruling question with fiqh term', () => {
      expect(detectAudienceMode('What is the ruling on this matter according to the madhab?')).toBe('Muslim')
    })
    it('detects halal/haram framing', () => {
      expect(detectAudienceMode('Is it halal to eat meat slaughtered this way?')).toBe('Muslim')
    })
  })

  describe('default to Muslim when ambiguous', () => {
    it('generic question with no signals defaults to Muslim', () => {
      expect(detectAudienceMode('What is the meaning of Ramadan?')).toBe('Muslim')
    })
    it('empty message defaults to Muslim', () => {
      expect(detectAudienceMode('')).toBe('Muslim')
    })
  })
})
