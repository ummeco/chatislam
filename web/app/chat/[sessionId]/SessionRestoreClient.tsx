'use client'

/**
 * ChatIslam — Session restore client (CB-07 T45)
 *
 * Loads a saved session and its messages from Hasura.
 * Renders the chat UI pre-populated with existing messages.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useConversationHistory } from '../../../hooks/useConversationHistory'

interface SessionRestoreClientProps {
  sessionId: string
}

export function SessionRestoreClient({ sessionId }: SessionRestoreClientProps) {
  const router = useRouter()
  const { session, messages, isLoading, error, fetchSession } = useConversationHistory()

  useEffect(() => {
    const token = localStorage.getItem('chatislam_token')
    if (!token) {
      router.push(`/auth/signin?next=/chat/${sessionId}`)
      return
    }
    void fetchSession(sessionId, token)
  }, [sessionId, router, fetchSession])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading conversation…</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Conversation not found'}</p>
        <Link href="/chat" className="text-sm text-emerald-600 underline dark:text-emerald-400">
          Start a new conversation
        </Link>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {session.title ?? 'Conversation'}
        </h1>
        {session.audience_mode && (
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            Mode: {session.audience_mode}
          </p>
        )}
      </div>

      {/* Message history */}
      <div className="space-y-3 mb-6" role="log" aria-label="Conversation history" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Continue conversation link */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <a
          href={`/chat?session=${session.id}`}
          className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          Continue conversation
        </a>
      </div>
    </main>
  )
}
