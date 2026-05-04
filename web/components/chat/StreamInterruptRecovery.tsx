'use client'

/**
 * ChatIslam — StreamInterruptRecovery component (CB-08 T48)
 *
 * Displays a recovery prompt when a stream interruption is detected.
 * Shows partial content recovered from Redis, and offers Resume / Discard actions.
 *
 * Props:
 *   partialContent  — recovered text to display
 *   onResume        — callback to resume the interrupted stream
 *   onDiscard       — callback to discard and start fresh
 *   attemptCount    — current resume attempt (1-3); shows warning at max
 *   isResuming      — true while resume fetch is in progress
 */

import { useState } from 'react'

interface StreamInterruptRecoveryProps {
  partialContent:  string
  onResume:        () => void
  onDiscard:       () => void
  attemptCount?:   number
  isResuming?:     boolean
}

const MAX_ATTEMPTS = 3

export function StreamInterruptRecovery({
  partialContent,
  onResume,
  onDiscard,
  attemptCount = 1,
  isResuming   = false,
}: StreamInterruptRecoveryProps) {
  const [discardConfirm, setDiscardConfirm] = useState(false)

  const attemptsLeft = MAX_ATTEMPTS - attemptCount + 1
  const atMaxAttempts = attemptCount >= MAX_ATTEMPTS

  function handleDiscardClick() {
    if (!discardConfirm) {
      setDiscardConfirm(true)
      return
    }
    onDiscard()
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <svg
          className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <span className="font-medium text-amber-800 dark:text-amber-300">
          Response interrupted
        </span>
      </div>

      {/* Explanation */}
      <p className="mb-3 text-amber-700 dark:text-amber-400">
        The connection was interrupted before the response finished.
        {atMaxAttempts
          ? ' This response cannot be resumed — the partial content has expired or cannot be verified.'
          : ` You can resume where it left off${attemptsLeft < MAX_ATTEMPTS ? ` (${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining)` : ''}.`}
      </p>

      {/* Partial content preview */}
      {partialContent && (
        <div className="mb-3 rounded border border-amber-200 bg-white p-3 dark:border-amber-700 dark:bg-amber-900/50">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Partial response
          </p>
          <p className="line-clamp-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {partialContent}
          </p>
          {partialContent.length > 200 && (
            <p className="mt-1 text-xs text-amber-500 dark:text-amber-600">
              …{partialContent.length} characters recovered
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!atMaxAttempts && (
          <button
            onClick={onResume}
            disabled={isResuming}
            className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-600"
            aria-busy={isResuming}
          >
            {isResuming ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Resuming…
              </span>
            ) : (
              'Resume response'
            )}
          </button>
        )}

        <button
          onClick={handleDiscardClick}
          disabled={isResuming}
          className={`rounded px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            discardConfirm
              ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
              : 'border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900'
          }`}
        >
          {discardConfirm ? 'Confirm discard' : 'Discard'}
        </button>

        {discardConfirm && (
          <button
            onClick={() => setDiscardConfirm(false)}
            disabled={isResuming}
            className="rounded px-3 py-1.5 text-xs text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default StreamInterruptRecovery
