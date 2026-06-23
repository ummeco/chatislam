/**
 * FILE: packages/consent/src/storage.ts
 * PURPOSE: Browser (DOM) consent storage adapter — localStorage IO.
 *          Delegates all pure logic to ./core/storage-pure.ts.
 * INVARIANTS: Only loaded in web/Next.js contexts. Never imported from RN.
 * DO NOT: Add pure logic here — it belongs in ./core/storage-pure.ts.
 * REFS: ADR-0027
 */
import type { ConsentRecord } from './types.js'
import {
  STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
  buildConsentRecord,
  buildAcceptAllRecord,
  buildRejectNonEssentialRecord,
  shouldRePrompt,
  parseConsentJson,
  serializeConsent,
} from './core/storage-pure.js'

export {
  STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
  buildConsentRecord,
  buildAcceptAllRecord,
  buildRejectNonEssentialRecord,
  shouldRePrompt,
}

function isServer(): boolean {
  return typeof window === 'undefined'
}

export function readConsent(): ConsentRecord | null {
  if (isServer()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return parseConsentJson(raw)
  } catch {
    return null
  }
}

export function writeConsent(record: ConsentRecord): void {
  if (isServer()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeConsent(record))
  } catch {
    // Storage may be unavailable in private browsing — fail silently
  }
}

export function clearConsent(): void {
  if (isServer()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Fail silently
  }
}
