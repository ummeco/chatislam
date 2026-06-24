/**
 * FILE:    chatislam/web/app/chat/error.tsx
 * PURPOSE: Next.js App Router error boundary for the /chat route segment.
 *   Catches server-side errors (layout, streaming failures). Client errors are
 *   handled by ErrorBoundary components in the client tree.
 *
 * SPORT: P2-E5-W01-S01-T01 — robustness rollout (chatislam/web)
 * Ref: .claude/docs/p2-robustness-framework-spec.md §3
 */

'use client'

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ChatError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('[ChatIslam/chat] route error', error)
  }, [error])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center"
      style={{ backgroundColor: '#0D2F17' }}
    >
      <div className="mb-6 text-4xl" aria-hidden="true">🕌</div>
      <h1 className="text-2xl font-bold text-white mb-3">Chat is unavailable</h1>
      <p className="text-white/50 mb-8 max-w-sm text-sm leading-relaxed">
        There was a problem loading the chat. Please try again — your session will be restored.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2.5 bg-[#1E5E2F] hover:bg-[#79C24C]/20 text-[#C9F27A] rounded-lg text-sm font-medium transition-colors border border-[#79C24C]/30"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 border border-white/10 hover:border-[#79C24C]/30 text-white/60 rounded-lg text-sm font-medium transition-colors"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
