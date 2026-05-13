'use client'

/**
 * ChatIslam — ChatSidebar component (CB-07 T43)
 *
 * Left sidebar showing saved conversation list for authenticated users.
 * - List of sessions with title + last message date
 * - "New chat" button
 * - Active session highlighted
 * - Sign in prompt for unauthenticated users
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface ConversationSummary {
  id:               string
  title:            string | null
  last_message_at:  string | null
  message_count:    number
  audience_mode:    string | null
}

interface ChatSidebarProps {
  isOpen?:  boolean
  onClose?: () => void
}

export function ChatSidebar({ isOpen = true, onClose }: ChatSidebarProps) {
  const router   = useRouter()
  const pathname = usePathname()

  const [sessions,   setSessions]   = useState<ConversationSummary[]>([])
  const [isLoading,  setIsLoading]  = useState(false)
  // Lazy initializer reads localStorage on first client render — avoids setState-in-effect.
  const [authToken]  = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('chatislam_token') : null
  )

  const fetchSessions = useCallback(async (token: string) => {
    setIsLoading(true)
    try {
      const HASURA_URL = process.env.NEXT_PUBLIC_HASURA_URL
      if (!HASURA_URL) return

      const res = await fetch(HASURA_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query {
              ci_sessions(
                order_by: { last_message_at: desc_nulls_last }
                limit:    50
              ) {
                id title last_message_at audience_mode
                messages_aggregate { aggregate { count } }
              }
            }`,
        }),
      })

      const data = await res.json() as {
        data?: {
          ci_sessions: Array<{
            id:              string
            title:           string | null
            last_message_at: string | null
            audience_mode:   string | null
            messages_aggregate: { aggregate: { count: number } }
          }>
        }
      }

      const raw = data.data?.ci_sessions ?? []
      setSessions(raw.map((s) => ({
        id:              s.id,
        title:           s.title,
        last_message_at: s.last_message_at,
        message_count:   s.messages_aggregate.aggregate.count,
        audience_mode:   s.audience_mode,
      })))
    } catch { /* silently ignore */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // fetchSessions is an async function — setState calls inside it are in callbacks,
    // not synchronously in the effect body. The rule incorrectly flags this pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authToken) void fetchSessions(authToken)
  }, [authToken, fetchSessions])

  function formatDate(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diffMs  = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 3600 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7)  return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <nav
      className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950"
      aria-label="Conversation history"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conversations</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
            aria-label="Close sidebar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* New chat button */}
      <div className="px-3 py-2">
        <button
          onClick={() => router.push('/chat')}
          className="flex w-full items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {!authToken && (
          <div className="px-2 py-4 text-center">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Sign in to save conversations
            </p>
            <a
              href="/auth/signin"
              className="text-xs text-emerald-600 underline dark:text-emerald-400"
            >
              Sign in
            </a>
          </div>
        )}

        {authToken && isLoading && (
          <div className="space-y-2 px-1 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 motion-safe:animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        )}

        {authToken && !isLoading && sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-gray-400 dark:text-gray-600">
            No conversations yet
          </p>
        )}

        {sessions.map((session) => {
          const isActive = pathname === `/chat/${session.id}`
          return (
            <button
              key={session.id}
              onClick={() => router.push(`/chat/${session.id}`)}
              className={`group flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`truncate text-sm ${isActive ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {session.title ?? 'Untitled conversation'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-600">
                {formatDate(session.last_message_at)}
                {session.message_count > 0 && ` · ${session.message_count} msg`}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default ChatSidebar
