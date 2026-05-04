'use client'

/**
 * ChatIslam — MadhabTagRow component (CB-02 T12)
 *
 * Inline row of madhhab stance tags below a chat message.
 * Shows only when the message has a fiqh question with 2+ stances.
 * Each tag is a pill with the madhhab name and a compact stance.
 */

import type { MadhabStance } from '../../lib/madhhab'

interface MadhabTagRowProps {
  stances:   MadhabStance[]
  className?: string
}

const MADHHAB_COLORS: Record<string, string> = {
  hanafi:  'bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-950  dark:text-blue-300  dark:border-blue-800',
  maliki:  'bg-teal-50   text-teal-700   border-teal-200   dark:bg-teal-950  dark:text-teal-300  dark:border-teal-800',
  shafii:  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  hanbali: 'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950 dark:text-amber-300  dark:border-amber-800',
}

const MADHHAB_LABELS: Record<string, string> = {
  hanafi:  'Hanafi',
  maliki:  'Maliki',
  shafii:  "Shafi'i",
  hanbali: 'Hanbali',
}

const DEFAULT_COLORS = 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'

export function MadhabTagRow({ stances, className = '' }: MadhabTagRowProps) {
  if (!stances || stances.length === 0) return null

  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      role="list"
      aria-label="Madhhab positions"
    >
      {stances.map((stance, i) => {
        const colors = MADHHAB_COLORS[stance.madhhab] ?? DEFAULT_COLORS
        const label  = MADHHAB_LABELS[stance.madhhab] ?? stance.madhhab
        return (
          <span
            key={i}
            role="listitem"
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${colors}`}
            title={stance.source ? `Source: ${stance.source}` : undefined}
          >
            <span className="font-medium">{label}</span>
            {stance.is_majority && (
              <span className="text-gray-400 dark:text-gray-600" aria-label="majority view">★</span>
            )}
            <span className="max-w-[120px] truncate text-opacity-80">
              {stance.stance}
            </span>
          </span>
        )
      })}
    </div>
  )
}

export default MadhabTagRow
