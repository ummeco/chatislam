'use client'

/**
 * ChatIslam — Rate Limit Banner (SCI-06)
 *
 * Shown inline when the API returns 429.
 * Two copy variants:
 *   daily_budget_exceeded  — token budget exhausted; resets at midnight UTC
 *   rate_limit             — per-minute/burst limit; brief retry delay
 *
 * Features:
 *   - Countdown to midnight UTC for daily_budget_exceeded
 *   - Dismissable (hides until next 429)
 *   - No full-page redirect
 *   - WCAG AA contrast on Ummat green palette
 */

import { useState, useEffect } from 'react'

export type RateLimitReason = 'daily_budget_exceeded' | 'rate_limit' | 'repeated_query'

interface RateLimitBannerProps {
  reason:          RateLimitReason
  retryAfterSeconds?: number
  onDismiss?:      () => void
}

function getMidnightUtcMs(): number {
  const now  = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return next.getTime()
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h   = Math.floor(totalSec / 3600)
  const m   = Math.floor((totalSec % 3600) / 60)
  const s   = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const COPY: Record<RateLimitReason, { heading: string; body: (countdown: string, retryAfter?: number) => string }> = {
  daily_budget_exceeded: {
    heading: 'Daily limit reached',
    body: (countdown) =>
      `You've reached the daily usage limit. Resets in ${countdown}.`,
  },
  rate_limit: {
    heading: 'Too many requests',
    body: (_countdown, retryAfter) =>
      retryAfter && retryAfter > 0
        ? `Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''} before sending another message.`
        : 'Please slow down a moment before sending another message.',
  },
  repeated_query: {
    heading: 'Repeated question detected',
    body: () =>
      'This question has been asked several times. Try rephrasing or ask something different.',
  },
}

export default function RateLimitBanner({
  reason,
  retryAfterSeconds,
  onDismiss,
}: RateLimitBannerProps) {
  const [dismissed,  setDismissed]  = useState(false)
  const [countdown,  setCountdown]  = useState('')

  useEffect(() => {
    if (reason !== 'daily_budget_exceeded') return

    function tick() {
      const remaining = getMidnightUtcMs() - Date.now()
      setCountdown(formatCountdown(remaining))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [reason])

  if (dismissed) return null

  const { heading, body } = COPY[reason]

  return (
    /* eslint-disable ummat/no-brand-light-on-light -- dark bg #1a3a1f, contrast ≥7:1 */
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 px-4 py-3.5 bg-[#1a3a1f] border border-[#2d5a35] rounded-lg text-[#C9F27A] text-sm leading-relaxed"
    >
      {/* Icon */}
      <span aria-hidden="true" className="text-lg shrink-0 mt-px">⏳</span>

      {/* Text */}
      <div className="flex-1">
        <strong className="block mb-1">{heading}</strong>
        <span className="text-[rgba(201,242,122,0.85)]">
          {body(countdown, retryAfterSeconds)}
        </span>
        {reason === 'daily_budget_exceeded' && (
          <span className="block mt-2 text-ummat-accent text-xs">
            <a href="/plus" className="text-ummat-accent hover:text-white underline">Upgrade to Plus</a>
            {' '}for unlimited access.
          </span>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => {
          setDismissed(true)
          onDismiss?.()
        }}
        aria-label="Dismiss rate limit notice"
        className="bg-transparent border-0 cursor-pointer text-[rgba(201,242,122,0.6)] text-lg shrink-0 p-0 leading-none hover:text-white transition-colors"
      >
        ×
      </button>
    </div>
    /* eslint-enable ummat/no-brand-light-on-light */
  )
}
