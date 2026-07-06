/**
 * ChatIslam — TutorIsland (CB-03 T25)
 *
 * AI Tutor landing island: shows available learning paths and user progress.
 * Migrated from app/tutor/TutorPageClient.tsx (Next.js) — logic identical.
 *
 * Next-isms replaced:
 *   - next/navigation useRouter().push(href) → window.location.assign(href)
 * All hooks, fetches, and lib imports unchanged (now resolved under src/).
 *
 * Auth: no longer reads a raw bearer token from localStorage. The
 * /api/tutor/* routes authenticate via the httpOnly ci_access_token cookie
 * (sent automatically with credentials: 'same-origin'); sign-in gating uses
 * getSession() from @/lib/session (no-localstorage-token fix).
 */

import { useState, useEffect } from 'react'
import { TutorPathSelector } from './tutor/TutorPathSelector'
import { TutorProgressCard } from './tutor/TutorProgressCard'
import { useTutor } from '../hooks/useTutor'
import { getSession } from '@/lib/session'

export function TutorIsland() {
  const { progress, isLoadingProgress, startSession, isStarting, sessionError, fetchProgress, activeSession } = useTutor()
  // Lazy initializer reads the cached profile on first render (client-only).
  // Presence of a profile means "was signed in last we checked" — the actual
  // credential is the httpOnly cookie, sent automatically by fetch().
  const [isSignedIn] = useState<boolean>(() => getSession() !== null)

  useEffect(() => {
    if (isSignedIn) void fetchProgress()
  }, [isSignedIn, fetchProgress])

  async function handlePathSelect(path: { id: string; slug: string }) {
    if (!isSignedIn) {
      window.location.assign('/auth/signin?next=/tutor')
      return
    }
    await startSession(path.id)
  }

  useEffect(() => {
    if (activeSession) {
      window.location.assign(`/tutor/${activeSession.path_id}`)
    }
  }, [activeSession])

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Tutor</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Structured Islamic learning with guided lessons and mastery tracking.
        </p>
      </div>

      {/* Progress section (authenticated) */}
      {isSignedIn && progress.length > 0 && (
        <section className="mb-8" aria-label="Your progress">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Continue learning</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {progress.map((p) => (
              <TutorProgressCard
                key={p.session_id}
                progress={p}
                onResume={(_, slug) => window.location.assign(`/tutor/${slug}`)}
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

export default TutorIsland
