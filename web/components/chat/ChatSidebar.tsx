'use client'

/**
 * ChatIslam — ChatSidebar component (CB-07 T43)
 *
 * Left sidebar showing saved conversation list for authenticated users.
 * - List of sessions with title + last message date
 * - "New chat" button
 * - Active session highlighted
 * - Sign in prompt for unauthenticated users
 *
 * Auth: no longer reads a raw bearer token from localStorage. GET
 * /api/chat/sessions authenticates via the httpOnly ci_access_token cookie
 * (sent automatically with credentials: 'same-origin'); sign-in gating uses
 * getSession() from @/lib/session (no-localstorage-token fix).
 */

import { useCallback, useEffect, useState } from 'react'
import { getSession } from '@/lib/session'

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
  // next/navigation removed (D-P2-STACK-CANON) — use the platform location API.
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

  const [sessions,   setSessions]   = useState<ConversationSummary[]>([])
  const [isLoading,  setIsLoading]  = useState(false)
  // Lazy initializer reads the cached profile on first render (client-only).
  // Presence of a profile means "was signed in last we checked" — the actual
  // credential is the httpOnly cookie, sent automatically by fetch().
  const [isSignedIn] = useState<boolean>(() => getSession() !== null)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/chat/sessions', {
        credentials: 'same-origin',
      })
      if (!res.ok) return

      const data = await res.json() as { sessions: ConversationSummary[] }
      setSessions(data.sessions ?? [])
    } catch { /* silently ignore */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // fetchSessions is async — setState runs in callbacks, not synchronously in the effect body.
    if (isSignedIn) void fetchSessions()
  }, [isSignedIn, fetchSessions])

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
          onClick={() => window.location.assign('/chat')}
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
        {!isSignedIn && (
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

        {isSignedIn && isLoading && (
          <div className="space-y-2 px-1 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 motion-safe:animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        )}

        {isSignedIn && !isLoading && sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-gray-400 dark:text-gray-600">
            No conversations yet
          </p>
        )}

        {sessions.map((session) => {
          const isActive = pathname === `/chat/${session.id}`
          return (
            <button
              key={session.id}
              onClick={() => window.location.assign(`/chat/${session.id}`)}
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
