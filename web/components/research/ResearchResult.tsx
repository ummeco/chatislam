'use client'

/**
 * ChatIslam — ResearchResult component (CB-01 T07)
 *
 * Renders Feynman research output:
 *   - Main result text (markdown-safe, prose styled)
 *   - Citation list with confidence badges
 *   - Madhhab analysis breakdown (scholarly only)
 *   - Isnad chains (scholarly only)
 *   - Cached indicator
 *   - Copy to clipboard
 */

import { useState } from 'react'
import type { ResearchResponse } from '../../lib/feynman-agent'
import type { CitationConfidence } from '../../lib/citation'

interface ResearchResultProps {
  result:     ResearchResponse
  className?: string
}

const CONFIDENCE_STYLES: Record<CitationConfidence, { label: string; className: string }> = {
  verified: {
    label:     'Verified',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  pending: {
    label:     'Pending',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  external: {
    label:     'External',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
}

const MADHHAB_LABELS: Record<string, string> = {
  hanafi:  'Hanafi',
  maliki:  'Maliki',
  shafii:  "Shafi'i",
  hanbali: 'Hanbali',
  majority: 'Majority',
}

export function ResearchResult({ result, className = '' }: ResearchResultProps) {
  const [copied, setCopied] = useState(false)
  const [showIsnads, setShowIsnads] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const hasMadhhab  = result.madhhab_analysis && Object.values(result.madhhab_analysis).some(Boolean)
  const hasIsnads   = result.isnads && result.isnads.length > 0
  const hasCitations = result.citations && result.citations.length > 0

  return (
    <article className={`space-y-4 ${className}`} aria-label="Research result">
      {/* Result text */}
      <div className="relative">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100">
          {/* Simple paragraph rendering — avoids markdown parser dependency */}
          {result.result.split('\n\n').map((para, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {para}
            </p>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="absolute right-0 top-0 rounded p-1 text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
          aria-label="Copy response to clipboard"
          title="Copy"
        >
          {copied ? (
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
      </div>

      {/* Madhhab analysis */}
      {hasMadhhab && result.madhhab_analysis && (
        <section aria-label="Madhhab positions">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Scholarly positions
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.entries(result.madhhab_analysis) as Array<[string, string | null]>)
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <p className="mb-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {MADHHAB_LABELS[key] ?? key}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{value}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Citations */}
      {hasCitations && (
        <section aria-label="Citations">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Sources
          </h3>
          <ul className="space-y-1.5">
            {result.citations.map((citation, i) => {
              const conf = CONFIDENCE_STYLES[citation.confidence]
              return (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${conf.className}`}>
                    {conf.label}
                  </span>
                  <span className="flex-1">
                    {citation.url ? (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 underline decoration-emerald-300 hover:decoration-emerald-600 dark:text-emerald-400 dark:decoration-emerald-700 dark:hover:decoration-emerald-400"
                      >
                        {citation.display}
                        {citation.madhhab && (
                          <span className="ml-1 text-gray-500 dark:text-gray-500">({citation.madhhab})</span>
                        )}
                      </a>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">
                        {citation.display}
                        {citation.madhhab && (
                          <span className="ml-1 text-gray-500 dark:text-gray-500">({citation.madhhab})</span>
                        )}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Isnad chains (scholarly) */}
      {hasIsnads && result.isnads && (
        <section aria-label="Isnad chains">
          <button
            onClick={() => setShowIsnads((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
            aria-expanded={showIsnads}
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showIsnads ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Isnad chains ({result.isnads.length})
          </button>

          {showIsnads && (
            <ul className="mt-2 space-y-2">
              {result.isnads.map((isnad, i) => (
                <li key={i} className="rounded border border-gray-200 bg-gray-50 p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{isnad.hadith}</p>
                  <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                    Collectors: {isnad.collectors.join(', ')} · Grade: {isnad.grade}
                  </p>
                  {isnad.chain && (
                    <p className="mt-1 text-gray-400 dark:text-gray-500">{isnad.chain}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Meta: cached + depth */}
      <div className="flex items-center gap-3 border-t border-gray-100 pt-2 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-600">
          Depth: <span className="capitalize">{result.depth_used}</span>
        </span>
        {result.cached && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-500">
            Cached
          </span>
        )}
      </div>
    </article>
  )
}

export default ResearchResult
