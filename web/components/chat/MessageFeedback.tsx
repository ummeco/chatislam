'use client'

/**
 * ChatIslam — MessageFeedback component (T04-P9)
 *
 * Thumbs-up / thumbs-down rating UI on each assistant message bubble.
 * Satisfies privacy policy: "ratings or corrections you submit are collected."
 *
 * On thumbs-down: expands an optional correction textarea (max 500 chars).
 * On submit: calls POST /api/feedback, disables the controls, shows micro-text.
 *
 * Props:
 *   messageId  — UUID of the ci_messages row being rated
 *   sessionId  — UUID of the current ci_sessions row (required for anon support)
 */

import { useState, useRef } from 'react'

export interface MessageFeedbackProps {
  messageId: string
  sessionId: string
}

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error'

type FlaggedReason = 'incorrect' | 'inappropriate' | 'off_topic'

export function MessageFeedback({ messageId, sessionId }: MessageFeedbackProps) {
  const [rating,          setRating         ] = useState<-1 | 1 | null>(null)
  const [showCorrection,  setShowCorrection  ] = useState(false)
  const [correctionText,  setCorrectionText  ] = useState('')
  const [flaggedReason,   setFlaggedReason   ] = useState<FlaggedReason | ''>('')
  const [submitState,     setSubmitState     ] = useState<SubmitState>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const MAX_CORRECTION = 500
  const remaining      = MAX_CORRECTION - correctionText.length

  async function submitFeedback(ratingValue: -1 | 1, finalCorrection?: string) {
    setSubmitState('submitting')
    try {
      const body: Record<string, unknown> = {
        message_id: messageId,
        session_id: sessionId,
        rating:     ratingValue,
      }
      if (finalCorrection) {
        body['correction_text'] = finalCorrection
      }
      if (flaggedReason) {
        body['flagged_reason'] = flaggedReason
      }

      const res = await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (res.ok) {
        setSubmitState('submitted')
      } else {
        setSubmitState('error')
      }
    } catch {
      setSubmitState('error')
    }
  }

  function handleThumbsUp() {
    if (submitState !== 'idle') return
    setRating(1)
    setShowCorrection(false)
    void submitFeedback(1)
  }

  function handleThumbsDown() {
    if (submitState !== 'idle') return
    setRating(-1)
    setShowCorrection(true)
    // Focus textarea on next tick
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function handleCorrectionSubmit() {
    void submitFeedback(-1, correctionText.trim() || undefined)
  }

  function handleCorrectionSkip() {
    void submitFeedback(-1)
  }

  if (submitState === 'submitted') {
    return (
      <p className="mt-2 text-xs text-emerald-600" aria-live="polite">
        Thank you for your feedback.
      </p>
    )
  }

  return (
    <div className="mt-2" aria-label="Rate this response">
      {/* Thumbs row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleThumbsUp}
          disabled={submitState !== 'idle'}
          aria-label="Helpful"
          aria-pressed={rating === 1}
          className={[
            'rounded p-1 text-sm transition-colors',
            submitState !== 'idle' ? 'cursor-not-allowed opacity-40' : 'hover:bg-emerald-900',
            rating === 1 ? 'text-emerald-400' : 'text-gray-500',
          ].join(' ')}
        >
          &#128077;
        </button>

        <button
          type="button"
          onClick={handleThumbsDown}
          disabled={submitState !== 'idle'}
          aria-label="Not helpful"
          aria-pressed={rating === -1}
          className={[
            'rounded p-1 text-sm transition-colors',
            submitState !== 'idle' ? 'cursor-not-allowed opacity-40' : 'hover:bg-red-950',
            rating === -1 ? 'text-red-400' : 'text-gray-500',
          ].join(' ')}
        >
          &#128078;
        </button>

        {submitState === 'submitting' && (
          <span className="text-xs text-gray-500" aria-live="polite">Saving...</span>
        )}
        {submitState === 'error' && (
          <span className="text-xs text-red-500" role="alert">Could not save — please try again.</span>
        )}
      </div>

      {/* Correction panel — visible on thumbs-down before submit */}
      {showCorrection && submitState === 'idle' && (
        <div className="mt-2 rounded-lg border border-gray-700 bg-gray-900 p-3">
          <p className="mb-1 text-xs font-medium text-gray-400">
            What was wrong? (optional)
          </p>

          {/* Reason selector */}
          <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Issue type">
            {([
              ['incorrect',      'Incorrect information'],
              ['inappropriate',  'Inappropriate content'],
              ['off_topic',      'Off topic'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFlaggedReason(flaggedReason === value ? '' : value)}
                aria-pressed={flaggedReason === value}
                className={[
                  'rounded border px-2 py-0.5 text-xs transition-colors',
                  flaggedReason === value
                    ? 'border-red-600 bg-red-950 text-red-300'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Free-text correction */}
          <textarea
            ref={textareaRef}
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value.slice(0, MAX_CORRECTION))}
            placeholder="Describe the issue (optional)..."
            rows={3}
            aria-label="Correction details"
            className="w-full resize-none rounded border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 placeholder-gray-600 focus:border-emerald-700 focus:outline-none"
          />
          <p className={['mt-0.5 text-right text-xs', remaining < 50 ? 'text-red-500' : 'text-gray-600'].join(' ')}>
            {remaining} chars remaining
          </p>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleCorrectionSubmit}
              className="rounded bg-emerald-800 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={handleCorrectionSkip}
              className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageFeedback
