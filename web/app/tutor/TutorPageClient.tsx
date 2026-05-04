'use client'

/**
 * ChatIslam — Tutor landing page client (CB-03 T25)
 */

import { useState, useEffect } from 'react'
import { TutorPathSelector } from '../../components/tutor/TutorPathSelector'
import { TutorProgressCard } from '../../components/tutor/TutorProgressCard'
import { useTutor } from '../../hooks/useTutor'
import { useRouter } from 'next/navigation'

export function TutorPageClient() {
  const router   = useRouter()
  const { progress, isLoadingProgress, startSession, isStarting, sessionError, fetchProgress, activeSession } = useTutor()
  // Lazy initializer reads from localStorage on first render (client-only).
  const [authToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('chatislam_token') : null
  )

  useEffect(() => {
    if (authToken) void fetchProgress(authToken)
  }, [authToken, fetchProgress])

  async function handlePathSelect(path: { id: string; slug: string }) {
    if (!authToken) {
      router.push('/auth/signin?next=/tutor')
      return
    }
    await startSession(path.id, authToken)
  }

  useEffect(() => {
    if (activeSession) {
      router.push(`/tutor/${activeSession.path_id}`)
    }
  }, [activeSession, router])

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Tutor</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Structured Islamic learning with guided lessons and mastery tracking.
        </p>
      </div>

      {/* Progress section (authenticated) */}
      {authToken && progress.length > 0 && (
        <section className="mb-8" aria-label="Your progress">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Continue learning</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {progress.map((p) => (
              <TutorProgressCard
                key={p.session_id}
                progress={p}
                onResume={(_, slug) => router.push(`/tutor/${slug}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Path selector */}
      <section aria-label="Available learning paths">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {isLoadingProgress ? 'Loading…' : progress.length > 0 ? 'Start a new path' : 'Choose a learning path'}
        </h2>
        <TutorPathSelector
          onSelect={handlePathSelect}
          disabled={isStarting}
        />
        {sessionError && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {sessionError === 'auth_required'
              ? 'Please sign in to start a learning path.'
              : sessionError}
          </p>
        )}
      </section>
    </main>
  )
}
