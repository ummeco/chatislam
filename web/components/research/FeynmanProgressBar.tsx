'use client'

/**
 * ChatIslam — FeynmanProgressBar component (CB-01 T06)
 *
 * Animated progress bar for Feynman research phases:
 *   Phase 1: Classifying topic…      (0-20%)
 *   Phase 2: Generating response…    (20-75%)
 *   Phase 3: Extracting citations…   (75-95%)
 *   Complete                         (100%)
 *
 * Uses CSS animation for smooth indeterminate progress during active phases.
 */

export type FeynmanPhase =
  | 'idle'
  | 'classifying'
  | 'generating'
  | 'citing'
  | 'complete'
  | 'error'

interface FeynmanProgressBarProps {
  phase:  FeynmanPhase
  depth?: 'summary' | 'intermediate' | 'scholarly'
}

const PHASE_CONFIG: Record<FeynmanPhase, { label: string; pct: number; color: string }> = {
  idle:        { label: '',                      pct: 0,   color: 'bg-gray-300 dark:bg-gray-700' },
  classifying: { label: 'Classifying topic…',   pct: 20,  color: 'bg-emerald-400 dark:bg-emerald-600' },
  generating:  { label: 'Generating response…', pct: 70,  color: 'bg-emerald-500 dark:bg-emerald-500' },
  citing:      { label: 'Extracting sources…',  pct: 90,  color: 'bg-emerald-600 dark:bg-emerald-400' },
  complete:    { label: 'Complete',             pct: 100, color: 'bg-emerald-600 dark:bg-emerald-400' },
  error:       { label: 'Research failed',      pct: 100, color: 'bg-red-500 dark:bg-red-600' },
}

const SCHOLARLY_LABELS: Partial<Record<FeynmanPhase, string>> = {
  generating: 'Analyzing with extended reasoning…',
  citing:     'Extracting isnads & madhhab positions…',
}

export function FeynmanProgressBar({ phase, depth }: FeynmanProgressBarProps) {
  if (phase === 'idle') return null

  const config = PHASE_CONFIG[phase]
  const label  = (depth === 'scholarly' && SCHOLARLY_LABELS[phase]) ? SCHOLARLY_LABELS[phase]! : config.label
  const isActive = phase !== 'complete' && phase !== 'error' && phase !== 'idle'

  return (
    <div className="w-full" aria-label={`Research progress: ${label}`} aria-live="polite">
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-xs ${phase === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {label}
        </span>
        {phase === 'complete' && (
          <svg
            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${config.color} ${
            isActive ? 'animate-pulse' : ''
          }`}
          style={{ width: `${config.pct}%` }}
          role="progressbar"
          aria-valuenow={config.pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

export default FeynmanProgressBar
