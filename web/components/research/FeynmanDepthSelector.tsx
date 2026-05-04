'use client'

/**
 * ChatIslam — FeynmanDepthSelector component (CB-01 T05)
 *
 * Three-button selector for Feynman research depth levels:
 *   summary      — Quick overview, no citations (Haiku)
 *   intermediate — Referenced answer with citations (Sonnet)
 *   scholarly    — Full academic analysis with isnads, madhhab breakdown (Sonnet + extended thinking)
 *
 * Accessible: role="radiogroup" with individual radio buttons.
 */

import type { FeynmanDepth } from '../../lib/feynman-agent'

interface FeynmanDepthSelectorProps {
  value:    FeynmanDepth
  onChange: (depth: FeynmanDepth) => void
  disabled?: boolean
}

const DEPTH_OPTIONS: Array<{
  value:       FeynmanDepth
  label:       string
  description: string
  badge:       string
  badgeColor:  string
}> = [
  {
    value:       'summary',
    label:       'Summary',
    description: 'Quick overview without citations',
    badge:       'Fast',
    badgeColor:  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  {
    value:       'intermediate',
    label:       'Intermediate',
    description: 'Referenced answer with Quran & hadith',
    badge:       'Cited',
    badgeColor:  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    value:       'scholarly',
    label:       'Scholarly',
    description: 'Full analysis: isnads, madhhab breakdown',
    badge:       'Deep',
    badgeColor:  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
]

export function FeynmanDepthSelector({ value, onChange, disabled = false }: FeynmanDepthSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Research depth"
      className="flex flex-col gap-2 sm:flex-row"
    >
      {DEPTH_OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        return (
          <label
            key={opt.value}
            className={`flex flex-1 cursor-pointer flex-col gap-1 rounded-lg border p-3 transition ${
              disabled ? 'cursor-not-allowed opacity-50' : ''
            } ${
              isSelected
                ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name="feynman-depth"
              value={opt.value}
              checked={isSelected}
              onChange={() => !disabled && onChange(opt.value)}
              disabled={disabled}
              className="sr-only"
              aria-describedby={`depth-desc-${opt.value}`}
            />
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'}`}>
                {opt.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${opt.badgeColor}`}>
                {opt.badge}
              </span>
            </div>
            <span
              id={`depth-desc-${opt.value}`}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {opt.description}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export default FeynmanDepthSelector
