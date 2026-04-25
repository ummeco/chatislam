import { describe, it, expect } from 'vitest'
import { parseEscalationSignal, shouldEscalateMessage } from '../lib/escalation'

describe('parseEscalationSignal — AI response token detection', () => {
  it('detects [ESCALATE_SONNET] signal', () => {
    expect(parseEscalationSignal('[ESCALATE_SONNET]')).toBe('SONNET')
  })

  it('detects [ESCALATE_HUMAN] signal', () => {
    expect(parseEscalationSignal('[ESCALATE_HUMAN]')).toBe('HUMAN')
  })

  it('[ESCALATE_HUMAN] takes priority over [ESCALATE_SONNET]', () => {
    expect(parseEscalationSignal('[ESCALATE_HUMAN] [ESCALATE_SONNET]')).toBe('HUMAN')
  })

  it('returns null for clean response', () => {
    expect(parseEscalationSignal('Islam has five pillars...')).toBeNull()
  })

  it('detects signal embedded in longer response', () => {
    const response = 'This requires scholarly guidance. [ESCALATE_SONNET]\nPlease consult...'
    expect(parseEscalationSignal(response)).toBe('SONNET')
  })

  it('returns null for empty string', () => {
    expect(parseEscalationSignal('')).toBeNull()
  })
})

describe('shouldEscalateMessage — pre-Tier1 routing', () => {
  it('escalates fatwa requests to SONNET', () => {
    expect(shouldEscalateMessage('Can you give me a fatwa on this?')).toBe('SONNET')
  })

  it('escalates halal/haram questions to SONNET', () => {
    expect(shouldEscalateMessage('Is it halal to do this?')).toBe('SONNET')
  })

  it('escalates "can I" framing to SONNET', () => {
    expect(shouldEscalateMessage('Can I combine my prayers when travelling?')).toBe('SONNET')
  })

  it('escalates personal situation framing to SONNET', () => {
    expect(shouldEscalateMessage('My husband said something and I need advice')).toBe('SONNET')
  })

  it('escalates divorce-3x to HUMAN (irreversible action)', () => {
    expect(shouldEscalateMessage('I said triple talaq in anger')).toBe('HUMAN')
  })

  it('escalates talaq three times to HUMAN', () => {
    expect(shouldEscalateMessage('I said talaq three times, what happens?')).toBe('HUMAN')
  })

  it('does not escalate basic FAQ questions', () => {
    expect(shouldEscalateMessage('What are the five pillars of Islam?')).toBeNull()
  })

  it('does not escalate dawah opener', () => {
    expect(shouldEscalateMessage('Why do Muslims fast during Ramadan?')).toBeNull()
  })
})
