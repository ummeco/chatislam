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
    <div
      role="alert"
      aria-live="polite"
      style={{
        display:         'flex',
        alignItems:      'flex-start',
        gap:             '0.75rem',
        padding:         '0.875rem 1rem',
        backgroundColor: '#1a3a1f',
        border:          '1px solid #2d5a35',
        borderRadius:    '0.5rem',
        color:           '#C9F27A',
        fontSize:        '0.875rem',
        lineHeight:      '1.5',
      }}
    >
      {/* Icon */}
      <span aria-hidden="true" style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.05rem' }}>⏳</span>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{heading}</strong>
        <span style={{ color: 'rgba(201, 242, 122, 0.85)' }}>
          {body(countdown, retryAfterSeconds)}
        </span>
        {reason === 'daily_budget_exceeded' && (
          <span
            style={{ display: 'block', marginTop: '0.5rem', color: '#79C24C', fontSize: '0.8rem' }}
          >
            <a href="/plus" style={{ color: '#79C24C' }}>Upgrade to Plus</a>
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
        style={{
          background:  'none',
          border:      'none',
          cursor:      'pointer',
          color:       'rgba(201, 242, 122, 0.6)',
          fontSize:    '1.1rem',
          flexShrink:  0,
          padding:     '0',
          lineHeight:  '1',
        }}
      >
        ×
      </button>
    </div>
  )
}
