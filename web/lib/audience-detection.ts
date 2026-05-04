/**
 * ChatIslam — Audience Detection (SCI-15, P4 CB-04 T28)
 *
 * Detects audience mode from first message content.
 * Three modes: Muslim | NewMuslim | NonMuslim
 * Default: Muslim (per ai-architecture.md)
 *
 * P4 extensions (T28): additional dawah-oriented NonMuslim signals,
 * isDawahContext() helper, and DAWAH_AUDIENCE_SIGNALS export.
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

// ─── P4: Extended dawah signals (CB-04 T28) ─────────────────────────────────

/**
 * Additional non-Muslim / dawah-oriented signals beyond the base NON_MUSLIM_SIGNALS.
 * These are subtler expressions of interest, skepticism, or seeking.
 */
export const DAWAH_AUDIENCE_SIGNALS: RegExp[] = [
  /does islam (teach|believe|say) that/i,
  /what (is|are) the (five|5) pillars/i,
  /who (is|was) (the )?prophet muhammad/i,
  /difference between (islam|muslims) and/i,
  /is (allah|god) the same in islam/i,
  /why do (muslims|women in islam) wear/i,
  /is it true that (islam|muslims)/i,
  /i (want|would like) to (know|understand|learn) (more )?about islam/i,
  /what does (the )?quran say about/i,
  /does god exist (according to islam)?/i,
  /why should i (become|consider becoming) (a )?muslim/i,
  /can (a )?non-?muslim (ask|learn about)/i,
  /my (friend|family member|spouse) is muslim/i,
  /i'?m (doing )?research (on|about) islam/i,
]

/**
 * Returns true if the message is likely from a non-Muslim seeking to learn about Islam.
 * Used to activate Dawah mode features in the UI.
 */
export function isDawahContext(message: string): boolean {
  return (
    NON_MUSLIM_SIGNALS.some((r) => r.test(message)) ||
    DAWAH_AUDIENCE_SIGNALS.some((r) => r.test(message))
  )
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
