'use client'

/**
 * ChatIslam — Research page client component (CB-01 T08)
 */

import { useState } from 'react'
import { FeynmanDepthSelector } from '../../components/research/FeynmanDepthSelector'
import { FeynmanProgressBar } from '../../components/research/FeynmanProgressBar'
import { ResearchResult } from '../../components/research/ResearchResult'
import { useFeynman } from '../../hooks/useFeynman'
import type { FeynmanDepth } from '../../lib/feynman-agent'

export function ResearchPageClient() {
  const [query, setQuery] = useState('')
  const [depth, setDepth] = useState<FeynmanDepth>('summary')

  const { phase, result, error, isLoading, search, reset } = useFeynman()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    // Track question asked event (D-P5-14: no question text for PII/theological content protection)
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track('chatislam.question.asked', {
        question_length: q.length,
        depth,
      })
    }

    await search(q, { depth })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Islamic Research
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Ask any Islamic question. Choose a depth level for the response.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Depth selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Research depth
          </label>
          <FeynmanDepthSelector value={depth} onChange={setDepth} disabled={isLoading} />
        </div>

        {/* Query input */}
        <div>
          <label htmlFor="research-query" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Question
          </label>
          <textarea
            id="research-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What is the ruling on combining prayers while travelling?"
            rows={3}
            maxLength={500}
            disabled={isLoading}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">
            {query.length}/500
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {isLoading ? 'Researching…' : 'Research'}
          </button>
          {(result || error) && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Progress */}
      {phase !== 'idle' && phase !== 'complete' && phase !== 'error' && (
        <div className="mt-6">
          <FeynmanProgressBar phase={phase} depth={depth} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error === 'rate_limited'
            ? 'Too many requests. Please wait a minute and try again.'
            : error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6">
          <ResearchResult result={result} />
        </div>
      )}
    </main>
  )
}
