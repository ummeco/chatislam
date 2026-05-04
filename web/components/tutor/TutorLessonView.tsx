'use client'

/**
 * ChatIslam — TutorLessonView component (CB-03 T24)
 *
 * Renders the AI Tutor conversation interface for a specific lesson.
 * Streams tutor messages via POST /api/tutor/message (SSE).
 * Shows: lesson objective, chat history, mastery score after each response,
 * level indicator, and streak.
 */

import { useState, useRef, useEffect } from 'react'
import { StreamInterruptRecovery } from '../chat/StreamInterruptRecovery'

interface TutorMessage {
  role:    'user' | 'assistant'
  content: string
}

interface TutorLessonViewProps {
  sessionId:      string
  lessonTitle:    string
  lessonObjective: string
  lessonNumber:   number
  currentLevel:   string
  streakDays:     number
  authToken:      string
}

export function TutorLessonView({
  sessionId,
  lessonTitle,
  lessonObjective,
  lessonNumber,
  currentLevel,
  streakDays,
  authToken,
}: TutorLessonViewProps) {
  const [messages,     setMessages]     = useState<TutorMessage[]>([])
  const [input,        setInput]        = useState('')
  const [isStreaming,  setIsStreaming]   = useState(false)
  const [masteryScore, setMasteryScore] = useState<number | null>(null)
  const [level,        setLevel]        = useState(currentLevel)
  const [streak,       setStreak]       = useState(streakDays)
  const [error,        setError]        = useState<string | null>(null)
  const [interrupted,  setInterrupted]  = useState(false)
  const [partialContent, setPartialContent] = useState('')
  const [lastMessageId, setLastMessageId]   = useState<string | null>(null)
  const [resumeAttempts, setResumeAttempts] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef       = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function sendMessage(text: string, resuming = false) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!resuming) {
      setMessages((prev) => [...prev, { role: 'user', content: text }])
    }
    setInput('')
    setIsStreaming(true)
    setError(null)
    setInterrupted(false)
    setMasteryScore(null)

    let assistantContent = ''
    const messageId = lastMessageId ?? undefined

    try {
      const res = await fetch('/api/tutor/message', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body:   JSON.stringify({ session_id: sessionId, message: text, message_id: messageId }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? 'Message failed')
      }

      const newMessageId = res.headers.get('X-Message-Id')
      if (newMessageId) setLastMessageId(newMessageId)

      // Add assistant message placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      // Read SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as {
                type:          string
                text?:         string
                message_id?:   string
                mastery_score?: number
                level?:        string
                streak?:       number
                message?:      string
              }

              if (event.type === 'delta' && event.text) {
                assistantContent += event.text
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                  return updated
                })
              }

              if (event.type === 'done') {
                if (event.mastery_score !== undefined) setMasteryScore(event.mastery_score)
                if (event.level)                       setLevel(event.level)
                if (event.streak !== undefined)        setStreak(event.streak)
                if (event.message_id)                  setLastMessageId(event.message_id)
              }

              if (event.type === 'error') {
                throw new Error(event.message ?? 'Stream error')
              }
            } catch { /* skip malformed SSE lines */ }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return

      // Check if this is a stream interruption we can recover from
      if (assistantContent.length > 50) {
        setPartialContent(assistantContent)
        setInterrupted(true)
        // Remove incomplete assistant message
        setMessages((prev) => prev.slice(0, -1))
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send message')
        // Remove the empty assistant placeholder if added
        setMessages((prev) => {
          if (prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1]?.content) {
            return prev.slice(0, -1)
          }
          return prev
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleResume() {
    if (resumeAttempts >= 3) return
    setResumeAttempts((n) => n + 1)
    // Re-send last user message to get a fresh response
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMessage) {
      setInterrupted(false)
      await sendMessage(lastUserMessage.content, true)
    }
  }

  function handleDiscard() {
    setInterrupted(false)
    setPartialContent('')
    setLastMessageId(null)
    setResumeAttempts(0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    await sendMessage(text)
  }

  const LEVEL_COLORS: Record<string, string> = {
    beginner:     'text-green-600 dark:text-green-400',
    intermediate: 'text-blue-600 dark:text-blue-400',
    advanced:     'text-purple-600 dark:text-purple-400',
  }

  return (
    <div className="flex h-full flex-col">
      {/* Lesson header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lesson {lessonNumber}</p>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{lessonTitle}</h2>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{lessonObjective}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
            <span className={`capitalize font-medium ${LEVEL_COLORS[level] ?? 'text-gray-600'}`}>
              {level}
            </span>
            {streak > 0 && (
              <span className="text-gray-500 dark:text-gray-400">🔥 {streak}</span>
            )}
          </div>
        </div>
        {masteryScore !== null && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Mastery:</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                style={{ width: `${masteryScore}%` }}
                role="progressbar"
                aria-valuenow={masteryScore}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="tabular-nums text-gray-700 dark:text-gray-300">{masteryScore}%</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-600">
            Start the lesson by saying hello, or ask about the topic.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {msg.content || (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce [animation-delay:0.1s]">·</span>
                  <span className="animate-bounce [animation-delay:0.2s]">·</span>
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Stream interruption recovery */}
        {interrupted && (
          <StreamInterruptRecovery
            partialContent={partialContent}
            onResume={handleResume}
            onDiscard={handleDiscard}
            attemptCount={resumeAttempts}
            isResuming={isStreaming}
          />
        )}

        {error && (
          <p role="alert" className="text-center text-xs text-red-500 dark:text-red-400">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 px-4 py-3 dark:border-gray-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response…"
            disabled={isStreaming}
            maxLength={2000}
            className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-emerald-500 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            aria-label="Message to tutor"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-full bg-emerald-600 p-2 text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            aria-label="Send message"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}

export default TutorLessonView
