export type AudienceMode = 'Muslim' | 'NewMuslim' | 'NonMuslim'

const NON_MUSLIM_SIGNALS = [
  /i'?m not (a )?muslim/i,
  /why do muslims/i,
  /what do you people believe/i,
  /i don'?t believe in (islam|allah|muhammad)/i,
]

const NEW_MUSLIM_SIGNALS = [
  /i (just )?took (my )?shahada/i,
  /i (just )?converted/i,
  /i'?m new to islam/i,
  /recently (became|converted)/i,
]

const MUSLIM_SIGNALS = [
  /\b(salah|zakah|wudu|sunnah|hadith|fiqh|madhab|aqeedah|tawheed)\b/i,
  /is it (halal|haram|permissible|allowed)/i,
  /according to (imam|sheikh|scholar)/i,
]

export function detectAudienceMode(message: string): AudienceMode {
  if (NON_MUSLIM_SIGNALS.some(r => r.test(message))) return 'NonMuslim'
  if (NEW_MUSLIM_SIGNALS.some(r => r.test(message))) return 'NewMuslim'
  if (MUSLIM_SIGNALS.some(r => r.test(message))) return 'Muslim'
  // Default: Muslim (per ai-architecture.md — "Muslim (default if ambiguous)")
  return 'Muslim'
}
