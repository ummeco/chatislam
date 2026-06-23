/**
 * @ummat/ui — LiveRegions
 *
 * Canonical pair of ARIA live regions mounted ONCE per page (T-P7-Q-A11Y-01).
 *
 * WCAG 2.2 AA:
 * - 4.1.3 Status Messages — announces transient updates without focus change.
 *
 * Anti-pattern: NEVER mount more than one polite + one assertive region per page.
 * Multiple regions cause screen reader chaos (NVDA/JAWS may speak the most-recently
 * mutated region only; VoiceOver may queue all of them sequentially).
 *
 * Usage:
 *   // app/layout.tsx (root, mounted once)
 *   <LiveRegions />
 *
 *   // any descendant component
 *   const announce = useLiveAnnounce();
 *   announce('Donation received', 'polite');
 *   announce('Save failed', 'assertive');
 *
 * Implementation notes:
 * - Polite region: <div role="status" aria-live="polite" aria-atomic="true">
 * - Assertive region: <div role="alert" aria-live="assertive" aria-atomic="true">
 * - Both regions are visually hidden via .ummat-sr-only (a11y.css class).
 * - Messages are debounced (default 100 ms) so rapid same-message bursts collapse
 *   into a single announcement.
 * - Messages are cleared after a delay (default 1000 ms) so the screen reader's
 *   buffer is reset and identical subsequent messages re-announce.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type LiveRegionPoliteness = 'polite' | 'assertive'

export interface LiveAnnounceOptions {
  /** Debounce duplicates within this window (ms). Default 100. */
  debounceMs?: number
  /** Clear the region after this delay so identical messages re-announce. Default 1000. */
  clearAfterMs?: number
}

export interface LiveAnnounceFn {
  (message: string, politeness?: LiveRegionPoliteness, options?: LiveAnnounceOptions): void
}

interface LiveRegionsContextValue {
  announce: LiveAnnounceFn
}

const LiveRegionsContext = createContext<LiveRegionsContextValue | null>(null)

export interface LiveRegionsProps {
  /** Default debounce window (ms). Default 100. */
  defaultDebounceMs?: number
  /** Default clear-after delay (ms). Default 1000. */
  defaultClearAfterMs?: number
  /** Optional className for the wrapper (sr-only by default). */
  className?: string
}

interface PendingState {
  message: string
  timestamp: number
}

export function LiveRegions({
  defaultDebounceMs = 100,
  defaultClearAfterMs = 1000,
  className = 'ummat-sr-only',
}: LiveRegionsProps = {}) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  const lastPoliteRef = useRef<PendingState>({ message: '', timestamp: 0 })
  const lastAssertiveRef = useRef<PendingState>({ message: '', timestamp: 0 })
  const politeClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assertiveClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (politeClearTimerRef.current) clearTimeout(politeClearTimerRef.current)
      if (assertiveClearTimerRef.current) clearTimeout(assertiveClearTimerRef.current)
    }
  }, [])

  const announce = useCallback<LiveAnnounceFn>(
    (message, politeness = 'polite', options) => {
      if (typeof message !== 'string' || message.length === 0) return
      const debounceMs = options?.debounceMs ?? defaultDebounceMs
      const clearAfterMs = options?.clearAfterMs ?? defaultClearAfterMs
      const now = Date.now()

      const lastRef = politeness === 'assertive' ? lastAssertiveRef : lastPoliteRef
      const setter = politeness === 'assertive' ? setAssertiveMessage : setPoliteMessage
      const clearTimerRef =
        politeness === 'assertive' ? assertiveClearTimerRef : politeClearTimerRef

      // Debounce: identical message within debounce window → drop.
      if (lastRef.current.message === message && now - lastRef.current.timestamp < debounceMs) {
        return
      }
      lastRef.current = { message, timestamp: now }

      // Clear-then-set pattern: brief blank forces screen readers to re-announce
      // even if the message text is identical to a prior announcement.
      setter('')
      // Use a microtask via Promise.resolve so React commits the empty state
      // before the new value lands; this defeats SR caching reliably.
      Promise.resolve().then(() => {
        setter(message)
      })

      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      clearTimerRef.current = setTimeout(() => {
        setter('')
      }, clearAfterMs)
    },
    [defaultDebounceMs, defaultClearAfterMs],
  )

  return (
    <LiveRegionsContext.Provider value={{ announce }}>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={className}
        data-ummat-live-region="polite"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={className}
        data-ummat-live-region="assertive"
      >
        {assertiveMessage}
      </div>
    </LiveRegionsContext.Provider>
  )
}

/**
 * Consume the live-region announcer from any descendant.
 *
 * Throws in development if called outside a <LiveRegions> ancestor so missing
 * mounts are caught at PR time rather than slipping into prod as silent no-ops.
 *
 * In production a missing provider degrades to a no-op (logs once via console.warn).
 */
let warnedNoProvider = false
export function useLiveAnnounce(): LiveAnnounceFn {
  const ctx = useContext(LiveRegionsContext)
  if (!ctx) {
    // Avoid a hard dep on @types/node — read NODE_ENV via globalThis.process if it exists.
    const env =
      (typeof globalThis !== 'undefined' &&
        (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV) ||
      'development'
    if (env !== 'production') {
      throw new Error(
        '[@ummat/ui] useLiveAnnounce() called without <LiveRegions /> ancestor. Mount <LiveRegions /> once in your app root layout.',
      )
    }
    if (!warnedNoProvider && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[@ummat/ui] useLiveAnnounce(): no <LiveRegions /> ancestor — announcements will be dropped.',
      )
      warnedNoProvider = true
    }
    return () => {
      /* no-op fallback */
    }
  }
  return ctx.announce
}

export default LiveRegions
