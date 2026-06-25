/**
 * i18n.ts — Locale resolution + message catalog access for ChatIslam (Astro).
 *
 * PURPOSE:
 *   ChatIslam switches locale via a `NEXT_LOCALE` cookie (carried over from the
 *   Next.js app), falling back to the request `Accept-Language` header, then the
 *   default locale. RTL locales (ar, ur, fa, …) drive `dir="rtl"` on <html>.
 *
 * INPUTS:  cookie value, Accept-Language header, a locale string.
 * OUTPUTS: a normalized supported `Locale`, RTL boolean, message catalog.
 * CONSTRAINTS:
 *   - No Next.js imports. Pure functions — safe in middleware, pages, and islands.
 *   - Supported locales mirror astro.config.ts `i18n.locales`.
 *   - Message catalogs live in `web/messages/<locale>.json`; missing groups fall
 *     back to English so partially-translated locales never render blank UI.
 * REF: P2-E3-W02-S02-T02 · D-P2-STACK-CANON
 */

import en from '../../messages/en.json'
import ar from '../../messages/ar.json'
import ur from '../../messages/ur.json'
import fa from '../../messages/fa.json'
import fr from '../../messages/fr.json'
import id from '../../messages/id.json'
import ms from '../../messages/ms.json'
import tr from '../../messages/tr.json'
import bn from '../../messages/bn.json'

/** Supported UI locales — mirror astro.config.ts i18n.locales. */
export const SUPPORTED_LOCALES = ['en', 'ar', 'ur', 'fa', 'fr', 'id', 'ms', 'tr', 'bn'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** RTL primary subtags (matches @ummat/astro-preset ALL_RTL_LOCALES). */
const RTL_LOCALES = new Set(['ar', 'ur', 'fa', 'he', 'ckb'])

/** Primary subtag of a BCP-47 tag, lower-cased ('ar-SA' → 'ar'). */
function primarySubtag(locale: string): string {
  return (locale.split('-')[0] ?? '').toLowerCase()
}

/** True when `locale` should render with `dir="rtl"`. */
export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(primarySubtag(locale))
}

/** Returns the supported `Locale` for `value`, or null when unsupported. */
export function normalizeLocale(value: string | undefined | null): Locale | null {
  if (!value) return null
  const primary = primarySubtag(value)
  return (SUPPORTED_LOCALES as readonly string[]).includes(primary) ? (primary as Locale) : null
}

/**
 * Resolve the active locale: `NEXT_LOCALE` cookie wins, then the first supported
 * tag in `Accept-Language`, then the default locale.
 */
export function resolveLocale(
  cookieValue?: string | null,
  acceptLanguage?: string | null,
): Locale {
  const fromCookie = normalizeLocale(cookieValue)
  if (fromCookie) return fromCookie

  if (acceptLanguage) {
    for (const part of acceptLanguage.split(',')) {
      const tag = part.split(';')[0]?.trim()
      const fromHeader = normalizeLocale(tag)
      if (fromHeader) return fromHeader
    }
  }

  return DEFAULT_LOCALE
}

// ─── Message catalogs ─────────────────────────────────────────────────────────

/** Canonical catalog shape — English is the source of truth for keys. */
type Catalog = typeof en

// Catalogs are runtime JSON with varying completeness (some locales omit groups
// or carry a `_comment`), so store them untyped and re-type at the return edge.
const CATALOGS: Record<Locale, unknown> = { en, ar, ur, fa, fr, id, ms, tr, bn }

type LooseCatalog = Record<string, Record<string, string>>

/**
 * Message catalog for `locale`, with each group merged over English so any
 * untranslated key falls back to the English string rather than rendering blank.
 */
export function getMessages(locale: string): Catalog {
  const normalized = normalizeLocale(locale) ?? DEFAULT_LOCALE
  if (normalized === DEFAULT_LOCALE) return en

  const base = en as unknown as LooseCatalog
  const catalog = CATALOGS[normalized] as LooseCatalog
  const merged: LooseCatalog = {}
  for (const group of Object.keys(base)) {
    merged[group] = { ...base[group], ...(catalog[group] ?? {}) }
  }
  return merged as unknown as Catalog
}
