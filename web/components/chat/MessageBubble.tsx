'use client'

/**
 * ChatIslam — MessageBubble component (CB-02 / CB-06 T41)
 *
 * Wraps a single chat message with:
 *   - User/assistant role styling
 *   - Arabic RTL support (lang + dir attributes)
 *   - Inline MadhabTagRow (CB-02) for fiqh responses
 *   - Inline CitationBadge row (CB-06) for cited responses
 *   - Scholar disclaimer on assistant messages
 *
 * Replaces the inline <article> block in /app/chat/page.tsx.
 * Both MadhabTagRow and CitationBadge render nothing when no data is present.
 */

import { MadhabTagRow }  from './MadhabTagRow'
import { CitationBadge } from './CitationBadge'
import type { MadhabStance } from '../../lib/madhhab'
import type { Citation }     from '../../lib/citation'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageBubbleProps {
  id:              string
  role:            'user' | 'assistant' | 'system'
  content:         string
  flagged?:        boolean
  /** 'ar' for Arabic responses detected server-side or client-side */
  lang?:           'ar' | 'en'
  /** Madhhab stances — present on fiqh responses when FF_MADHHAB=true */
  madhabStances?:  MadhabStance[]
  /** Citations — present when Feynman research or citation-enriched response */
  citations?:      Citation[]
  /** Scholar disclaimer text — defaults to canonical warning */
  disclaimer?:     string
}

// ─── Default disclaimer ───────────────────────────────────────────────────────

const DEFAULT_DISCLAIMER =
  'This response is AI-generated for informational purposes only. ' +
  'It is not a fatwa or authoritative religious ruling. ' +
  'Please consult a qualified Islamic scholar for personal religious guidance.'

// ─── Component ────────────────────────────────────────────────────────────────

export function MessageBubble({
  id,
  role,
  content,
  flagged        = false,
  lang           = 'en',
  madhabStances  = [],
  citations      = [],
  disclaimer     = DEFAULT_DISCLAIMER,
}: MessageBubbleProps) {
  const isAssistant = role === 'assistant'
  const isUser      = role === 'user'
  const isRtl       = isAssistant && lang === 'ar'

  const hasMadhabStances = madhabStances.length >= 2
  const hasCitations     = citations.length > 0

  return (
    <article
      lang={isRtl ? 'ar' : undefined}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={[
        'mb-4 rounded-xl p-4',
        isUser      ? 'bg-emerald-950 border border-emerald-900' : '',
        isAssistant ? 'border border-gray-700 bg-transparent' : '',
        flagged     ? 'border-red-800 bg-red-950' : '',
      ].filter(Boolean).join(' ')}
      aria-label={`${isUser ? 'You' : 'ChatIslam'}: ${content.slice(0, 60)}${content.length > 60 ? '…' : ''}`}
    >
      {/* Role label */}
      <p
        className={[
          'mb-1 text-sm font-semibold',
          isUser      ? 'text-emerald-300' : 'text-emerald-400',
          flagged     ? 'text-red-400'     : '',
        ].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        {isUser ? 'You' : 'ChatIslam'}
        {flagged && <span className="ml-2 text-red-400 text-xs">(moderated)</span>}
      </p>

      {/* Message content */}
      <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
        {content}
      </p>

      {/* Madhhab stance tags — only on assistant messages with 2+ stances (CB-02) */}
      {isAssistant && hasMadhabStances && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Madhhab positions
          </p>
          <MadhabTagRow stances={madhabStances} />
        </div>
      )}

      {/* Citation badges — only on assistant messages with citations (CB-06) */}
      {isAssistant && hasCitations && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Sources
          </p>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Citations">
            {citations.map((citation, i) => (
              <span key={`${citation.url ?? citation.display}-${i}`} role="listitem">
                <CitationBadge citation={citation} index={i} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scholar disclaimer — only on assistant messages */}
      {isAssistant && (
        <p className="mt-3 text-xs leading-snug text-emerald-700 opacity-80">
          {disclaimer}
        </p>
      )}
    </article>
  )
}

export default MessageBubble
