/**
 * ChatIslam — Seasonal Mode (Islamic Calendar) (CB-05 T33)
 *
 * Computes active Islamic seasonal mode from the Hijri calendar.
 * Uses intl-hijri package — no custom calendar logic.
 *
 * Seasonal modes:
 *   ramadan:     1–29/30 Ramadan
 *   eid_al_fitr: 1–3 Shawwal
 *   dhul_hijjah: 1–10 Dhul Hijjah
 *   eid_al_adha: 10–13 Dhul Hijjah
 *
 * Final authority: ci_seasonal_config.is_active (cron-managed)
 * Override: SEASONAL_MODE_OVERRIDE env var
 */

export type SeasonalMode = 'ramadan' | 'eid_al_fitr' | 'eid_al_adha' | 'dhul_hijjah'

export interface SeasonalStatusResponse {
  active:       boolean
  mode:         SeasonalMode | null
  days_remaining: number | null
  activated_at: string | null
}

// ─── Hijri months (1-indexed) ────────────────────────────────────────────────────

const HIJRI_MONTH_RAMADAN      = 9
const HIJRI_MONTH_SHAWWAL      = 10
const HIJRI_MONTH_DHUL_HIJJAH  = 12

// ─── Lazy-load intl-hijri ────────────────────────────────────────────────────────

interface HijriDate {
  hYear:  number
  hMonth: number
  hDate:  number
}

function toHijri(date: Date): HijriDate {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IntlHijri = require('intl-hijri') as {
      toHijri(y: number, m: number, d: number): HijriDate
    }
    return IntlHijri.toHijri(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    )
  } catch {
    // Fallback approximation if package not installed
    // (should never happen in production — intl-hijri is required)
    const jd = gregorianToJulian(date.getFullYear(), date.getMonth() + 1, date.getDate())
    return julianToHijri(jd)
  }
}

/** Julian day number from Gregorian calendar */
function gregorianToJulian(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yr = y + 4800 - a
  const mo = m + 12 * a - 3
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045
}

/** Convert Julian day number to Hijri date (simplified) */
function julianToHijri(jd: number): HijriDate {
  const l = jd - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l1 = l - 10631 * n + 354
  const j = Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) + Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238)
  const l2 = l1 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const m = Math.floor((24 * l2) / 709)
  const d = l2 - Math.floor((709 * m) / 24)
  const y = 30 * n + j - 30
  return { hYear: y, hMonth: m, hDate: d }
}

// ─── Moon sighting API (optional) ────────────────────────────────────────────────

interface MoonSightingResponse {
  ramadan_start?: string  // ISO date
}

async function fetchMoonSightingData(): Promise<MoonSightingResponse | null> {
  const apiUrl = process.env.SEASONAL_MOON_SIGHTING_API
  if (!apiUrl) return null
  try {
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return await res.json() as MoonSightingResponse
  } catch {
    return null
  }
}

// ─── Main computation ────────────────────────────────────────────────────────────

/**
 * Compute the current Islamic seasonal mode.
 * Returns null when no active season.
 *
 * Final authority is ci_seasonal_config.is_active (checked by cron),
 * but this function drives the cron computation.
 */
export async function getCurrentSeasonalMode(): Promise<SeasonalMode | null> {
  // Hard override via env
  const override = process.env.SEASONAL_MODE_OVERRIDE
  if (override && ['ramadan', 'eid_al_fitr', 'eid_al_adha', 'dhul_hijjah'].includes(override)) {
    return override as SeasonalMode
  }

  const now   = new Date()
  const hijri = toHijri(now)
  const { hMonth, hDate } = hijri

  // Moon sighting adjustment for Ramadan start (optional)
  let ramadanStartAdjust = 0
  const moonData = await fetchMoonSightingData()
  if (moonData?.ramadan_start) {
    const moonStart = new Date(moonData.ramadan_start)
    const diff = Math.round((moonStart.getTime() - now.getTime()) / (1000 * 3600 * 24))
    if (Math.abs(diff) <= 2) ramadanStartAdjust = diff
  }

  const adjustedHDate = hDate - ramadanStartAdjust

  // Eid al-Adha: 10–13 Dhul Hijjah (check before dhul_hijjah to prioritize)
  if (hMonth === HIJRI_MONTH_DHUL_HIJJAH && adjustedHDate >= 10 && adjustedHDate <= 13) {
    return 'eid_al_adha'
  }

  // Dhul Hijjah first 9 days
  if (hMonth === HIJRI_MONTH_DHUL_HIJJAH && adjustedHDate >= 1 && adjustedHDate <= 9) {
    return 'dhul_hijjah'
  }

  // Eid al-Fitr: 1–3 Shawwal
  if (hMonth === HIJRI_MONTH_SHAWWAL && adjustedHDate >= 1 && adjustedHDate <= 3) {
    return 'eid_al_fitr'
  }

  // Ramadan: 1–30 Ramadan
  if (hMonth === HIJRI_MONTH_RAMADAN && adjustedHDate >= 1 && adjustedHDate <= 30) {
    return 'ramadan'
  }

  return null
}

/**
 * Compute days remaining in the current seasonal mode.
 * Returns null if no active mode.
 */
export function computeDaysRemaining(mode: SeasonalMode, date: Date = new Date()): number | null {
  const hijri = toHijri(date)
  const { hMonth, hDate } = hijri

  switch (mode) {
    case 'ramadan':
      if (hMonth === HIJRI_MONTH_RAMADAN) return 30 - hDate
      return null
    case 'eid_al_fitr':
      if (hMonth === HIJRI_MONTH_SHAWWAL && hDate <= 3) return 3 - hDate
      return null
    case 'dhul_hijjah':
      if (hMonth === HIJRI_MONTH_DHUL_HIJJAH && hDate <= 9) return 9 - hDate
      return null
    case 'eid_al_adha':
      if (hMonth === HIJRI_MONTH_DHUL_HIJJAH && hDate >= 10 && hDate <= 13) return 13 - hDate
      return null
    default:
      return null
  }
}
