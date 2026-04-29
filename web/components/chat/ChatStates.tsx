/**
 * ChatIslam — B5-02 UI States
 *
 * Seven data states for chat surfaces:
 *   loading (streaming) | empty | error | offline | partial | success | stale
 *
 * WCAG 2.2 AA:
 *   - aria-live="polite" on status regions
 *   - role="alert" on error / offline (assertive)
 *   - role="status" on loading / stale
 */

'use client'

import React from 'react'

// ─── Loading / Streaming Indicator ───────────────────────────────────────────

interface StreamingDotsProps {
  /** Assistive label for screen readers */
  label?: string
}

export function StreamingDots({ label = 'AI is responding…' }: StreamingDotsProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex items-center gap-1 px-3 py-2"
    >
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-green-mid, #79C24C)',
            animation: `ci-dot-bounce var(--duration-slow, 400ms) var(--easing-in-out, ease-in-out) ${i * 133}ms infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes ci-dot-bounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-4px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes ci-dot-bounce {
            from { opacity: 0.4; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>
  )
}

// ─── Empty State (no chat history) ───────────────────────────────────────────

interface EmptyChatProps {
  onStartChat?: () => void
}

export function EmptyChat({ onStartChat }: EmptyChatProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: '2.5rem',
          lineHeight: 1,
        }}
      >
        🕌
      </div>
      <div>
        <p
          style={{
            fontSize: 'var(--text-lg, 1.125rem)',
            fontWeight: 600,
            color: 'var(--color-text-primary, #f0fce8)',
            marginBottom: '0.5rem',
          }}
        >
          As-salamu alaykum
        </p>
        <p
          style={{
            fontSize: 'var(--text-sm, 0.875rem)',
            color: 'var(--color-text-muted, rgba(201, 242, 122, 0.55))',
            maxWidth: '24rem',
          }}
        >
          Ask any question about Islam — prayer, fiqh, Quran, hadith, or Islamic history.
          All answers are for informational purposes only.
        </p>
      </div>
      {onStartChat && (
        <button
          onClick={onStartChat}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: 'var(--radius-lg, 0.5rem)',
            backgroundColor: 'var(--brand-green-mid, #79C24C)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 'var(--text-sm, 0.875rem)',
            border: 'none',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Start a conversation
        </button>
      )}
    </div>
  )
}

// ─── Error State (API fail / server error) ────────────────────────────────────

interface ChatErrorProps {
  message?: string
  onRetry?: () => void
}

export function ChatError({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ChatErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg, 0.5rem)',
        backgroundColor: 'var(--color-error-bg, #1a0000)',
        border: '1px solid var(--color-error, #f87171)',
        margin: '1rem',
        textAlign: 'center',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>⚠️</span>
      <p
        style={{
          color: 'var(--color-error, #f87171)',
          fontSize: 'var(--text-sm, 0.875rem)',
          margin: 0,
        }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md, 0.375rem)',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-error, #f87171)',
            color: 'var(--color-error, #f87171)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm, 0.875rem)',
            minHeight: '44px',
          }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

// ─── Offline Banner ───────────────────────────────────────────────────────────

export function OfflineBanner() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--color-warning-bg, #1a1800)',
        borderBottom: '1px solid var(--color-warning, #e8c84a)',
        color: 'var(--color-warning, #e8c84a)',
        fontSize: 'var(--text-sm, 0.875rem)',
        fontWeight: 500,
      }}
    >
      <span aria-hidden="true">📶</span>
      <span>You&apos;re offline. Your message will be sent when you reconnect.</span>
    </div>
  )
}
