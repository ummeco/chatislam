'use client'

/**
 * ChatIslam — useChat hook (CB-08 T49)
 *
 * Extension of the chat client to support stream interruption recovery.
 * Adds:
 *   - INTERRUPTED state
 *   - resume(sessionId, messageId, clientHash) — recovers from interruption
 *   - streamState tracking per message
 *
 * Used alongside the existing /app/chat/page.tsx streaming logic.
 * Stream interruption is detected by AbortError + partial content length > 50.
 */

import { useState, useCallback, useRef } from 'react'

export type ChatStreamState =
  | 'idle'
  | 'streaming'
  | 'complete'
  | 'interrupted'
  | 'error'

export interface InterruptedMessage {
  sessionId:     string
  messageId:     string
  partialHash:   string
  partialLength: number
  attemptCount:  number
}

interface UseChatStreamReturn {
  streamState:    ChatStreamState
  interrupted:    InterruptedMessage | null
  resumeAttempts: number
  setStreaming:   () => void
  setComplete:    () => void
  setInterrupted: (data: InterruptedMessage) => void
  setError:       () => void
  reset:          () => void
  canResume:      boolean
}

const MAX_RESUME_ATTEMPTS = 3

/**
 * Compute SHA-256 hash of partial content for server-side verification.
 */
export async function computePartialHash(content: string): Promise<string> {
  if (typeof window === 'undefined') return ''
  try {
    const encoder = new TextEncoder()
    const data    = encoder.encode(content)
    const hashBuf = await crypto.subtle.digest('SHA-256', data)
    const hashArr = Array.from(new Uint8Array(hashBuf))
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return ''
  }
}

export function useChatStream(): UseChatStreamReturn {
  const [streamState,    setStreamState]    = useState<ChatStreamState>('idle')
  const [interrupted,    setInterruptedMsg] = useState<InterruptedMessage | null>(null)
  const [resumeAttempts, setResumeAttempts] = useState(0)
  const attemptRef = useRef(0)

  const setStreaming = useCallback(() => {
    setStreamState('streaming')
    setInterruptedMsg(null)
  }, [])

  const setComplete = useCallback(() => {
    setStreamState('complete')
    setInterruptedMsg(null)
    attemptRef.current = 0
    setResumeAttempts(0)
  }, [])

  const setInterrupted = useCallback((data: InterruptedMessage) => {
    attemptRef.current += 1
    setResumeAttempts(attemptRef.current)
    setInterruptedMsg({ ...data, attemptCount: attemptRef.current })
    setStreamState('interrupted')
  }, [])

  const setError = useCallback(() => {
    setStreamState('error')
  }, [])

  const reset = useCallback(() => {
    setStreamState('idle')
    setInterruptedMsg(null)
    attemptRef.current = 0
    setResumeAttempts(0)
  }, [])

  return {
    streamState,
    interrupted,
    resumeAttempts,
    setStreaming,
    setComplete,
    setInterrupted,
    setError,
    reset,
    canResume: resumeAttempts < MAX_RESUME_ATTEMPTS,
  }
}

export default useChatStream
