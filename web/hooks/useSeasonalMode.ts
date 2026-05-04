'use client'

/**
 * ChatIslam — useSeasonalMode hook (CB-05 T35)
 *
 * Fetches seasonal mode from GET /api/seasonal/status.
 * Caches in memory for the browser session.
 */

import { useState, useEffect } from 'react'
import type { SeasonalMode } from '../lib/seasonal'

interface SeasonalStatus {
  active:         boolean
  mode:           SeasonalMode | null
  days_remaining: number | null
  activated_at:   string | null
}

interface UseSeasonalModeReturn {
  mode:           SeasonalMode | null
  daysRemaining:  number | null
  activatedAt:    string | null
  isLoading:      boolean
}

let _cachedStatus: SeasonalStatus | null = null

export function useSeasonalMode(): UseSeasonalModeReturn {
  const [status,    setStatus]    = useState<SeasonalStatus | null>(_cachedStatus)
  const [isLoading, setIsLoading] = useState(_cachedStatus === null)

  useEffect(() => {
    if (_cachedStatus) {
      setStatus(_cachedStatus)
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchStatus() {
      try {
        const res = await fetch('/api/seasonal/status', {
          next: { revalidate: 1800 },  // 30min client hint
        })
        if (!res.ok) return
        const data = await res.json() as SeasonalStatus
        _cachedStatus = data
        if (!cancelled) {
          setStatus(data)
        }
      } catch { /* silently ignore */ } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchStatus()

    // Re-fetch when seasonal-dismissed event fires (banner was dismissed)
    function onDismissed() {
      _cachedStatus = null
      setStatus(null)
    }
    window.addEventListener('seasonal-dismissed', onDismissed)

    return () => {
      cancelled = true
      window.removeEventListener('seasonal-dismissed', onDismissed)
    }
  }, [])

  return {
    mode:          status?.mode ?? null,
    daysRemaining: status?.days_remaining ?? null,
    activatedAt:   status?.activated_at ?? null,
    isLoading,
  }
}

export default useSeasonalMode
