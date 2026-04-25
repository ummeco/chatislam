export type EscalationSignal = 'SONNET' | 'HUMAN' | null

const ESCALATION_KEYWORDS_TIER1 = [
  'ruling', 'fatwa', 'halal', 'haram', 'permissible', 'prohibited', 'allowed',
  'divorce', 'madhab', 'can i', 'am i allowed',
]

const PERSONAL_FRAMING = [
  /my (husband|wife|mother|father|son|daughter)/i,
  /i did [a-z]/i,
  /what should i do/i,
]

const IRREVERSIBLE_FIQH = [
  /triple talaq/i,
  /talaq (3|three) times/i,
  /oath of expiation/i,
  /kaffarah/i,
]

/**
 * Parse an AI response for escalation signal tokens.
 * Returns 'SONNET' for [ESCALATE_SONNET], 'HUMAN' for [ESCALATE_HUMAN], null if clean.
 */
export function parseEscalationSignal(aiResponse: string): EscalationSignal {
  if (aiResponse.includes('[ESCALATE_HUMAN]')) return 'HUMAN'
  if (aiResponse.includes('[ESCALATE_SONNET]')) return 'SONNET'
  return null
}

/**
 * Determine if a user message should be escalated before hitting Tier 1.
 * Returns 'SONNET' if the question contains fiqh/ruling keywords or personal situation framing.
 */
export function shouldEscalateMessage(message: string): EscalationSignal {
  const lower = message.toLowerCase()
  if (IRREVERSIBLE_FIQH.some(r => r.test(message))) return 'HUMAN'
  if (ESCALATION_KEYWORDS_TIER1.some(kw => lower.includes(kw))) return 'SONNET'
  if (PERSONAL_FRAMING.some(r => r.test(message))) return 'SONNET'
  return null
}
