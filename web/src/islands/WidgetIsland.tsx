/**
 * WidgetIsland.tsx — Embeddable chat widget React 19 island (client:load)
 *
 * PURPOSE: Minimal chat UI for iframe embedding (SCI-16). Migrated from the
 *   Next.js ChatWidget client component. Renders inside the /widget Astro page.
 *
 * INPUTS:
 *   - mode: audience mode (Muslim | NewMuslim | NonMuslim)
 *   - sessionId: optional pre-issued session id (skips /api/widget/init when set)
 *
 * OUTPUTS: Full chat functionality via /api/chat, session_id posted to the parent
 *   window via postMessage on init, mandatory compact disclaimer footer (SCI-12).
 *
 * CONSTRAINTS:
 *   - No Next.js or next/* imports.
 *   - API paths (/api/chat, /api/widget/init) unchanged — now Astro endpoints.
 *   - CSP: parent must allowlist chatislam.org in frame-ancestors.
 * REF: SCI-16 · D-P2-STACK-CANON
 */

import { useState, useRef, useEffect, useCallback } from 'react'

type AudienceMode = 'Muslim' | 'NewMuslim' | 'NonMuslim'

export interface WidgetIslandProps {
  mode?:      AudienceMode
  sessionId?: string | null
}

interface Message {
  id:      string
  role:    'user' | 'assistant'
  content: string
}

const DISCLAIMER_COMPACT = 'AI response only — not a fatwa. Consult a scholar.'

export default function WidgetIsland({ mode = 'Muslim', sessionId: initSessionId = null }: WidgetIslandProps) {
  const [messages,        setMessages]        = useState<Message[]>([])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [conversationId,  setConversationId]  = useState<string | null>(null)
  const [sessionId,       setSessionId]       = useState<string | null>(initSessionId)
  const [error,           setError]           = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Init: get session_id + notify parent
  useEffect(() => {
    if (initSessionId) {
      window.parent?.postMessage({ type: 'chatislam:session_ready', sessionId: initSessionId }, '*')
      return
    }

    fetch('/api/widget/init', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode }),
    })
      .then((r) => r.json() as Promise<{ sessionId: string; mode: string }>)
      .then((data) => {
        setSessionId(data.sessionId)
        window.parent?.postMessage({ type: 'chatislam:session_ready', sessionId: data.sessionId }, '*')
      })
      .catch(() => { /* fail open */ })
  }, [mode, initSessionId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setLoading(true)

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:       text,
          conversationId,
          audienceMode:  mode,
          sessionId,
          history:       messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.status === 429) {
        setError('Rate limit reached. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      const data = await res.json() as { content?: string; conversationId?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }

      if (data.conversationId && !conversationId) setConversationId(data.conversationId)

      const assistantMsg: Message = {
        id:      crypto.randomUUID(),
        role:    'assistant',
        content: data.content ?? '',
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [input, loading, conversationId, sessionId, mode, messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Message list — P2-E6 AC-05: aria-live="polite" so screen readers announce new messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        aria-atomic="false"
        style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        {messages.length === 0 && (
          <p style={{ color: 'rgba(201, 242, 122, 0.5)', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
            Ask a question about Islam…
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf:    msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth:     '85%',
              padding:      '0.5rem 0.75rem',
              borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
              backgroundColor: msg.role === 'user' ? '#1e5e2f' : '#162b1a',
              border:       `1px solid ${msg.role === 'user' ? '#2d7a3e' : '#2d5a35'}`,
              color:        '#C9F27A',
              fontSize:     '0.85rem',
              lineHeight:   '1.5',
              whiteSpace:   'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', color: 'rgba(201, 242, 122, 0.5)', fontSize: '0.8rem' }}>
            Thinking…
          </div>
        )}
        {error && (
          <p role="alert" style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #2d5a35', backgroundColor: '#0d2f17' }}>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }}
            placeholder="Ask about Islam…"
            aria-label="Chat message"
            disabled={loading}
            style={{
              flex:            1,
              backgroundColor: '#162b1a',
              border:          '1px solid #2d5a35',
              borderRadius:    '0.375rem',
              padding:         '0.375rem 0.625rem',
              color:           '#C9F27A',
              fontSize:        '0.85rem',
              outline:         'none',
            }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            style={{
              padding:         '0.375rem 0.75rem',
              backgroundColor: loading || !input.trim() ? '#1e3a1f' : '#1e5e2f',
              color:           '#C9F27A',
              border:          '1px solid #2d7a3e',
              borderRadius:    '0.375rem',
              cursor:          loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize:        '0.85rem',
              fontWeight:      600,
            }}
          >
            Send
          </button>
        </div>
        <p
          role="note"
          aria-label="Disclaimer: AI-generated content, not a fatwa"
          style={{
            color:      'rgba(201, 242, 122, 0.5)',
            fontSize:   '0.7rem',
            lineHeight: 1.4,
            textAlign:  'center',
            marginTop:  '0.25rem',
          }}
        >
          {DISCLAIMER_COMPACT}
        </p>
      </div>
    </div>
  )
}
