/**
 * ChatIslam — useTutor hook (CB-03 T26)
 *
 * Manages tutor session lifecycle:
 *   - Fetches user's progress from GET /api/tutor/progress
 *   - Creates/resumes a session via POST /api/tutor/session
 *   - Exposes session state for tutor pages
 *
 * Migrated from app/hooks/useTutor.ts (Next.js) — logic identical, no next/* imports.
 */

import { useState, useCallback } from 'react'

interface TutorProgress {
  session_id:        string
  path_id:           string
  path_slug:         string
  path_title:        string
  current_lesson_id: string | null
  level:             string
  avg_mastery:       number
  lessons_completed: number
  total_lessons:     number
  completion_pct:    number
  streak_days:       number
  last_active_at:    string | null
  completed_at:      string | null
  started_at:        string
}

interface TutorSession {
  id:                string
  user_id:           string
  path_id:           string
  current_lesson_id: string | null
  level:             string
  mastery_scores:    Record<string, number>
  streak_days:       number
  last_active_at:    string | null
  completed_at:      string | null
  created_at:        string
}

interface UseTutorReturn {
  progress:        TutorProgress[]
  isLoadingProgress: boolean
  activeSession:   TutorSession | null
  isStarting:      boolean
  sessionError:    string | null
  fetchProgress:   (token: string) => Promise<void>
  startSession:    (pathId: string, token: string) => Promise<void>
  clearSession:    () => void
}

export function useTutor(): UseTutorReturn {
  const [progress,          setProgress]          = useState<TutorProgress[]>([])
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)
  const [activeSession,     setActiveSession]     = useState<TutorSession | null>(null)
  const [isStarting,        setIsStarting]        = useState(false)
  const [sessionError,      setSessionError]      = useState<string | null>(null)

  const fetchProgress = useCallback(async (token: string) => {
    setIsLoadingProgress(true)
    try {
      const res = await fetch('/api/tutor/progress', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json() as { progress: TutorProgress[] }
      setProgress(data.progress)
    } catch { /* silently ignore */ } finally {
      setIsLoadingProgress(false)
    }
  }, [])

  const startSession = useCallback(async (pathId: string, token: string) => {
    setIsStarting(true)
    setSessionError(null)
    try {
      const res = await fetch('/api/tutor/session', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ path_id: pathId }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        if (res.status === 401) {
          throw new Error('auth_required')
        }
        throw new Error(err.error ?? 'Failed to start session')
      }

      const data = await res.json() as { session: TutorSession; resumed: boolean }
      setActiveSession(data.session)
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setIsStarting(false)
    }
  }, [])

  const clearSession = useCallback(() => {
    setActiveSession(null)
    setSessionError(null)
  }, [])

  return {
    progress,
    isLoadingProgress,
    activeSession,
    isStarting,
    sessionError,
    fetchProgress,
    startSession,
    clearSession,
  }
}

export default useTutor
