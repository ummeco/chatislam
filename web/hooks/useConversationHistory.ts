'use client'

/**
 * ChatIslam — useConversationHistory hook (CB-07 T44)
 *
 * Fetches and manages chat session history for authenticated users.
 *   - fetchSession(sessionId)  — loads messages for a session
 *   - createSession()          — creates a new session
 *   - saveMessage(role, content, sessionId) — persists a message
 *
 * Feature flag: FF_CONVERSATION_HISTORY
 */

import { useState, useCallback } from 'react'

interface ChatMessage {
  id:         string
  role:       'user' | 'assistant'
  content:    string
  created_at: string
  session_id: string
}

interface ChatSession {
  id:              string
  title:           string | null
  audience_mode:   string | null
  last_message_at: string | null
  created_at:      string
}

interface UseConversationHistoryReturn {
  session:      ChatSession | null
  messages:     ChatMessage[]
  isLoading:    boolean
  error:        string | null
  fetchSession: (sessionId: string, token: string) => Promise<void>
  saveMessage:  (role: 'user' | 'assistant', content: string, sessionId: string, token: string) => Promise<void>
  updateTitle:  (sessionId: string, title: string, token: string) => Promise<void>
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const [session,   setSession]   = useState<ChatSession | null>(null)
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const fetchSession = useCallback(async (sessionId: string, token: string) => {
    if (process.env.NEXT_PUBLIC_FF_CONVERSATION_HISTORY === 'false') return

    setIsLoading(true)
    setError(null)

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
            query($session_id: uuid!) {
              ci_sessions(where: { id: { _eq: $session_id } }, limit: 1) {
                id title audience_mode last_message_at created_at
              }
              ci_messages(
                where:    { session_id: { _eq: $session_id } }
                order_by: { created_at: asc }
              ) {
                id role content created_at session_id
              }
            }`,
          variables: { session_id: sessionId },
        }),
      })

      const data = await res.json() as {
        data?: {
          ci_sessions: ChatSession[]
          ci_messages: ChatMessage[]
        }
        errors?: Array<{ message: string }>
      }

      if (data.errors?.length) throw new Error(data.errors[0].message)

      setSession(data.data?.ci_sessions[0] ?? null)
      setMessages(data.data?.ci_messages ?? [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveMessage = useCallback(async (
    role:      'user' | 'assistant',
    content:   string,
    sessionId: string,
    token:     string,
  ) => {
    if (process.env.NEXT_PUBLIC_FF_CONVERSATION_HISTORY === 'false') return

    try {
      const HASURA_URL = process.env.NEXT_PUBLIC_HASURA_URL
      if (!HASURA_URL) return

      await fetch(HASURA_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation($obj: ci_messages_insert_input!) {
              insert_ci_messages_one(object: $obj) { id }
            }`,
          variables: {
            obj: { session_id: sessionId, role, content },
          },
        }),
      })
    } catch { /* non-blocking — best effort */ }
  }, [])

  const updateTitle = useCallback(async (
    sessionId: string,
    title:     string,
    token:     string,
  ) => {
    try {
      const HASURA_URL = process.env.NEXT_PUBLIC_HASURA_URL
      if (!HASURA_URL) return

      await fetch(HASURA_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation($id: uuid!, $title: String!) {
              update_ci_sessions_by_pk(pk_columns: { id: $id }, _set: { title: $title }) { id }
            }`,
          variables: { id: sessionId, title },
        }),
      })

      setSession((prev) => prev ? { ...prev, title } : prev)
    } catch { /* non-blocking */ }
  }, [])

  return {
    session,
    messages,
    isLoading,
    error,
    fetchSession,
    saveMessage,
    updateTitle,
  }
}

export default useConversationHistory
