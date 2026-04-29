/**
 * ChatIslam — Audience Detection (SCI-15)
 *
 * Detects audience mode from first message content.
 * Three modes: Muslim | NewMuslim | NonMuslim
 * Default: Muslim (per ai-architecture.md)
 */

export type AudienceMode = 'Muslim' | 'NewMuslim' | 'NonMuslim'

const NON_MUSLIM_SIGNALS: RegExp[] = [
  /i'?m not (a )?muslim/i,
  /why do muslims/i,
  /what do (you people|muslims) believe/i,
  /i don'?t believe in (islam|allah|muhammad)/i,
  /i'?m (a )?(christian|jewish|hindu|buddhist|atheist|agnostic)/i,
  /from (a )?(christian|non-muslim|jewish|secular) perspective/i,
  /curious about islam/i,
  /learning about islam for the first time/i,
]

const NEW_MUSLIM_SIGNALS: RegExp[] = [
  /i (just )?took (my )?shahada/i,
  /i (just )?converted/i,
  /i'?m new to islam/i,
  /recently (became|converted)\s+(a\s+)?muslim/i,
  /how do i (start|begin|learn) (as a new muslim|practicing islam)/i,
  /first steps? (in|as a) (new )?muslim/i,
]

const MUSLIM_SIGNALS: RegExp[] = [
  /\b(salah|zakah|wudu|sunnah|hadith|fiqh|madhab|aqeedah|tawheed|tawbah|dua|dhikr)\b/i,
  /is it (halal|haram|permissible|allowed|makruh|mustahab)/i,
  /according to (imam|sheikh|scholar|the (hanafi|maliki|shafii|hanbali) madhab)/i,
  /\b(jumu'?a|khutba|ghusl|tayammum|istinja|adhan|iqama|rakat|sajdah)\b/i,
]

/**
 * Auto-detect audience mode from the user's first message.
 * Only called once per session; stored in ci_sessions.audience_mode thereafter.
 */
export function detectAudienceMode(message: string): AudienceMode {
  if (NON_MUSLIM_SIGNALS.some((r) => r.test(message))) return 'NonMuslim'
  if (NEW_MUSLIM_SIGNALS.some((r) => r.test(message))) return 'NewMuslim'
  if (MUSLIM_SIGNALS.some((r) => r.test(message)))     return 'Muslim'
  // Default: Muslim (most users are Muslim — ai-architecture.md)
  return 'Muslim'
}

/**
 * System prompt addendum per audience mode.
 * Prepended after the main theological guardrails.
 */
export const AUDIENCE_MODE_PROMPTS: Record<AudienceMode, string> = {
  Muslim: '',  // Default guardrails are already Muslim-oriented

  NewMuslim: `
AUDIENCE MODE: New Muslim
The user has recently embraced Islam or is a beginner. Adapt your response:
- Use simple, encouraging language. Avoid technical Arabic terms without explanation.
- Celebrate their journey; be warm and supportive.
- Focus on practical guidance (how to pray, make wudu, etc.) over advanced fiqh.
- Do not overwhelm with scholarly opinions — give the most straightforward Sunni answer.`.trim(),

  NonMuslim: `
AUDIENCE MODE: Non-Muslim / Dawah
The user may not be Muslim. Adapt your response for outreach (dawah):
- Use "God" instead of "Allah" where clarity helps non-Muslims.
- Explain Islamic terms when first used.
- Avoid assuming Islamic knowledge. Bridge-build, do not preach.
- Be welcoming, patient, and non-judgmental.
- Do not pressure or argue — present Islam's beauty clearly and let the person reflect.`.trim(),
}
