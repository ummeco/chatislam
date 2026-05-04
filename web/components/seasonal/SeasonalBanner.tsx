'use client'

/**
 * ChatIslam — SeasonalBanner component (CB-05 T35)
 *
 * Displays a contextual Islamic seasonal banner.
 * Reads seasonal mode from useSeasonalMode hook.
 * Dismissible per-session (sessionStorage).
 * Hidden when no active season.
 */

import { useSeasonalMode } from '../../hooks/useSeasonalMode'
import type { SeasonalMode } from '../../lib/seasonal'

const SEASONAL_CONTENT: Record<SeasonalMode, {
  emoji:       string
  title:       string
  message:     string
  bgClass:     string
  borderClass: string
  textClass:   string
}> = {
  ramadan: {
    emoji:       '🌙',
    title:       'Ramadan Mubarak',
    message:     'May Allah accept your fasting and prayers.',
    bgClass:     'bg-indigo-50 dark:bg-indigo-950',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
    textClass:   'text-indigo-800 dark:text-indigo-300',
  },
  eid_al_fitr: {
    emoji:       '🎉',
    title:       'Eid Mubarak',
    message:     'Taqabbalallahu minna wa minkum — may Allah accept from us and you.',
    bgClass:     'bg-green-50 dark:bg-green-950',
    borderClass: 'border-green-200 dark:border-green-800',
    textClass:   'text-green-800 dark:text-green-300',
  },
  eid_al_adha: {
    emoji:       '🐑',
    title:       'Eid al-Adha Mubarak',
    message:     'May Allah accept your sacrifices and grant you and your family His blessings.',
    bgClass:     'bg-amber-50 dark:bg-amber-950',
    borderClass: 'border-amber-200 dark:border-amber-800',
    textClass:   'text-amber-800 dark:text-amber-300',
  },
  dhul_hijjah: {
    emoji:       '🕋',
    title:       'First 10 Days of Dhul Hijjah',
    message:     'The best days of the year — increase in good deeds, dhikr, and fasting.',
    bgClass:     'bg-teal-50 dark:bg-teal-950',
    borderClass: 'border-teal-200 dark:border-teal-800',
    textClass:   'text-teal-800 dark:text-teal-300',
  },
}

const DISMISS_KEY = 'chatislam_seasonal_dismissed'

export function SeasonalBanner() {
  const { mode, daysRemaining, isLoading } = useSeasonalMode()

  if (isLoading || !mode) return null

  // Check dismiss (sessionStorage — dismisses per browser session)
  if (typeof window !== 'undefined') {
    const dismissed = sessionStorage.getItem(DISMISS_KEY)
    if (dismissed === mode) return null
  }

  const content = SEASONAL_CONTENT[mode]

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISS_KEY, mode!)
    }
    // Trigger re-render via custom event
    window.dispatchEvent(new Event('seasonal-dismissed'))
  }

  return (
    <div
      role="banner"
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${content.bgClass} ${content.borderClass}`}
      aria-label={`Seasonal greeting: ${content.title}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg" role="img" aria-hidden="true">{content.emoji}</span>
        <div>
          <p className={`text-sm font-semibold ${content.textClass}`}>
            {content.title}
            {daysRemaining !== null && daysRemaining > 0 && (
              <span className="ml-2 text-xs font-normal opacity-70">
                {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
              </span>
            )}
          </p>
          <p className={`mt-0.5 text-xs ${content.textClass} opacity-80`}>
            {content.message}
          </p>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className={`mt-0.5 shrink-0 rounded p-0.5 transition hover:opacity-70 ${content.textClass}`}
        aria-label="Dismiss seasonal greeting"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default SeasonalBanner
