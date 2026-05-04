'use client'

/**
 * ChatIslam — CitationBadge component (CB-06 T40)
 *
 * Renders a single citation as an inline badge.
 * Confidence colors: verified=green, pending=yellow, external=gray
 * Links to the citation URL if present.
 * Tooltip shows full citation display text on hover.
 */

import type { Citation } from '../../lib/citation'

interface CitationBadgeProps {
  citation:   Citation
  index?:     number
  className?: string
}

const CONFIDENCE_STYLES: Record<string, { badge: string; dot: string }> = {
  verified: {
    badge: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900',
    dot:   'bg-green-500',
  },
  pending: {
    badge: 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 dark:hover:bg-yellow-900',
    dot:   'bg-yellow-500',
  },
  external: {
    badge: 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
    dot:   'bg-gray-400',
  },
}

const TYPE_ICONS: Record<string, string> = {
  quran:   '📖',
  hadith:  '📜',
  scholar: '🎓',
  fatwa:   '⚖️',
  article: '📄',
}

export function CitationBadge({ citation, index, className = '' }: CitationBadgeProps) {
  const styles      = CONFIDENCE_STYLES[citation.confidence] ?? CONFIDENCE_STYLES.external
  const typeIcon    = TYPE_ICONS[citation.type] ?? '📄'
  const displayText = citation.madhhab
    ? `${citation.display} (${citation.madhhab})`
    : citation.display

  const content = (
    <>
      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
      <span className="hidden sm:inline" aria-hidden="true">{typeIcon}</span>
      <span className="max-w-[180px] truncate">
        {index !== undefined && (
          <span className="mr-0.5 opacity-60">[{index + 1}]</span>
        )}
        {displayText}
      </span>
    </>
  )

  const sharedClass = `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${styles.badge} ${className}`

  if (citation.url) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className={sharedClass}
        title={displayText}
        aria-label={`Citation: ${displayText} (${citation.confidence})`}
      >
        {content}
        <svg className="h-2.5 w-2.5 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    )
  }

  return (
    <span
      className={sharedClass}
      title={displayText}
      aria-label={`Citation: ${displayText} (${citation.confidence})`}
    >
      {content}
    </span>
  )
}

export default CitationBadge
