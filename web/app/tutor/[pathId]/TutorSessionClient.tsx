'use client'

/**
 * ChatIslam — Tutor session client (CB-03 T25)
 *
 * Fetches the session for pathId, then renders TutorLessonView.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TutorLessonView } from '../../../components/tutor/TutorLessonView'

interface TutorLesson {
  id:                     string
  path_id:                string
  lesson_number:          number
  slug:                   string
  title:                  string
  objective:              string
  system_prompt_addendum: string
  mastery_questions:      Array<{ q: string; answer_keywords: string[] }>
  prerequisite_lesson_id: string | null
  created_at:             string
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
}

interface TutorSessionClientProps {
  pathId: string
}

export function TutorSessionClient({ pathId }: TutorSessionClientProps) {
  const router = useRouter()
  const [session,    setSession]    = useState<TutorSession | null>(null)
  const [lesson,     setLesson]     = useState<TutorLesson | null>(null)
  // Lazy initializer reads localStorage on first client render — avoids setState-in-effect.
  const [authToken]  = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('chatislam_token') : null
  )
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    const token = authToken
    if (!token) {
      router.push(`/auth/signin?next=/tutor/${pathId}`)
      return
    }

    async function loadSession() {
      try {
        // Start or resume session
        const sessionRes = await fetch('/api/tutor/session', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ path_id: pathId }),
        })

        if (!sessionRes.ok) {
          if (sessionRes.status === 401) {
            router.push(`/auth/signin?next=/tutor/${pathId}`)
            return
          }
          throw new Error('Failed to load session')
        }

        const sessionData = await sessionRes.json() as { session: TutorSession }
        setSession(sessionData.session)

        // Fetch current lesson
        if (sessionData.session.current_lesson_id) {
          const lessonRes = await fetch(
            `/api/tutor/lesson?id=${sessionData.session.current_lesson_id}`,
          )
          if (lessonRes.ok) {
            const lessonData = await lessonRes.json() as { lesson: TutorLesson }
            setLesson(lessonData.lesson)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tutor session')
      } finally {
        setIsLoading(false)
      }
    }

    void loadSession()
  }, [authToken, pathId, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Loading tutor session…
        </div>
      </div>
    )
  }

  if (error || !session || !lesson) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Session not found'}</p>
        <button
          onClick={() => router.push('/tutor')}
          className="text-sm text-emerald-600 underline dark:text-emerald-400"
        >
          Back to learning paths
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <TutorLessonView
        sessionId={session.id}
        lessonTitle={lesson.title}
        lessonObjective={lesson.objective}
        lessonNumber={lesson.lesson_number}
        currentLevel={session.level}
        streakDays={session.streak_days}
        authToken={authToken!}
      />
    </div>
  )
}
