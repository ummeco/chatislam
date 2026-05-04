'use client'

/**
 * ChatIslam — useFeynman hook (CB-01 T08)
 *
 * Manages Feynman research state and API calls.
 * - Calls POST /api/research
 * - Pre-checks GET /api/research/cached before calling research
 * - Tracks phase for FeynmanProgressBar
 * - Abort on component unmount
 */

import { useState, useCallback, useRef } from 'react'
import type { ResearchResponse, FeynmanDepth } from '../lib/feynman-agent'
import type { FeynmanPhase } from '../components/research/FeynmanProgressBar'
import type { MadhabTag } from '../lib/madhhab'

interface UseFeynmanOptions {
  depth?:    FeynmanDepth
  madhhab?:  MadhabTag
  language?: 'en' | 'ar' | 'id'
}

interface UseFeynmanReturn {
  phase:      FeynmanPhase
  result:     ResearchResponse | null
  error:      string | null
  isLoading:  boolean
  search:     (query: string, opts?: UseFeynmanOptions) => Promise<void>
  reset:      () => void
}

export function useFeynman(defaultOpts: UseFeynmanOptions = {}): UseFeynmanReturn {
  const [phase,  setPhase]  = useState<FeynmanPhase>('idle')
  const [result, setResult] = useState<ResearchResponse | null>(null)
  const [error,  setError]  = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setPhase('idle')
    setResult(null)
    setError(null)
  }, [])

  const search = useCallback(async (query: string, opts: UseFeynmanOptions = {}) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const depth    = opts.depth    ?? defaultOpts.depth    ?? 'summary'
    const madhhab  = opts.madhhab  ?? defaultOpts.madhhab
    const language = opts.language ?? defaultOpts.language ?? 'en'

    setError(null)
    setResult(null)

    // Phase 1: classifying
    setPhase('classifying')

    try {
      // Cache check first (cheap)
      const cacheUrl = `/api/research/cached?q=${encodeURIComponent(query)}&depth=${depth}&lang=${language}`
      const cacheRes = await fetch(cacheUrl, { signal: controller.signal })

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json() as {
          cached:  boolean
          result?: ResearchResponse
        }
        if (cacheData.cached && cacheData.result) {
          setPhase('complete')
          setResult(cacheData.result)
          return
        }
      }

      // Phase 2: generating
      setPhase('generating')

      const body: Record<string, unknown> = { query, depth, language }
      if (madhhab) body.madhhab = madhhab

      const authToken = typeof window !== 'undefined'
        ? localStorage.getItem('chatislam_token')
        : null

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`

      const res = await fetch('/api/research', {
        method:  'POST',
        headers,
        body:    JSON.stringify(body),
        signal:  controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json() as { error?: string; message?: string }
        if (res.status === 429) {
          throw new Error('rate_limited')
        }
        throw new Error(errData.message ?? errData.error ?? 'Research failed')
      }

      // Phase 3: citations
      setPhase('citing')

      const data = await res.json() as ResearchResponse

      setPhase('complete')
      setResult(data)

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setPhase('error')
      setError(
        err instanceof Error ? err.message : 'Research failed. Please try again.',
      )
    }
  }, [defaultOpts.depth, defaultOpts.madhhab, defaultOpts.language])

  return {
    phase,
    result,
    error,
    isLoading: phase !== 'idle' && phase !== 'complete' && phase !== 'error',
    search,
    reset,
  }
}

export default useFeynman
