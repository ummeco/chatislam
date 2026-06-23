/**
 * FILE: packages/consent/src/core/storage-pure.ts
 * PURPOSE: Platform-agnostic consent record building, validation, and lifecycle predicates.
 *          Zero DOM access. Zero AsyncStorage. Pure functions only.
 * INVARIANTS: Never import `window`, `document`, `localStorage`, `AsyncStorage`, or any
 *             react/react-dom/react-native module.
 * DO NOT: Add read/write IO here. IO lives in `./web/storage.ts` (DOM) or
 *         `@ummat/consent-native/storage` (AsyncStorage).
 * REFS: ADR-0027 — Package RN-Compat Strategy
 */
import type { ConsentRecord, ConsentVersion, ConsentCategories } from '../types.js'

export const STORAGE_KEY = 'ummat_consent'
export const CURRENT_CONSENT_VERSION: ConsentVersion = '2'

export function buildConsentRecord(
  categories: ConsentCategories,
  options: { doNotTrack?: boolean; doNotSell?: boolean } = {}
): ConsentRecord {
  return {
    version: CURRENT_CONSENT_VERSION,
    timestamp: Date.now(),
    categories,
    doNotTrack: options.doNotTrack ?? false,
    doNotSell: options.doNotSell ?? false,
    explicit: true,
  }
}

export function buildAcceptAllRecord(
  options: { doNotTrack?: boolean; doNotSell?: boolean } = {}
): ConsentRecord {
  return buildConsentRecord(
    { analytics: true, marketing: true, functional: true },
    options
  )
}

export function buildRejectNonEssentialRecord(
  options: { doNotTrack?: boolean; doNotSell?: boolean } = {}
): ConsentRecord {
  return buildConsentRecord(
    { analytics: false, marketing: false, functional: false },
    options
  )
}

export function shouldRePrompt(record: ConsentRecord | null): boolean {
  if (!record) return true
  if (record.version !== CURRENT_CONSENT_VERSION) return true
  return false
}

export function isValidConsentRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  if (typeof obj.version !== 'string') return false
  if (typeof obj.timestamp !== 'number') return false
  if (typeof obj.explicit !== 'boolean') return false

  const cats = obj.categories
  if (!cats || typeof cats !== 'object') return false
  const c = cats as Record<string, unknown>
  if (typeof c.analytics !== 'boolean') return false
  if (typeof c.marketing !== 'boolean') return false
  if (typeof c.functional !== 'boolean') return false

  return true
}

/**
 * Parse a stored consent JSON string into a typed record.
 * Returns null on parse failure, version mismatch, or invalid shape.
 * Platform-agnostic: caller is responsible for reading the raw string from
 * whatever storage backend (localStorage / AsyncStorage / cookie).
 */
export function parseConsentJson(raw: string | null): ConsentRecord | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isValidConsentRecord(parsed)) return null
    if (parsed.version !== CURRENT_CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Serialise a consent record to JSON for storage.
 */
export function serializeConsent(record: ConsentRecord): string {
  return JSON.stringify(record)
}
