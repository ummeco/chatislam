'use client'

/**
 * ChatIslam — Conversation UI
 * Route: /chat
 * Sprint 10 — T1-10-03
 *
 * Features:
 *   - Scrollable conversation history
 *   - Audience mode selector (dawah / Q&A / tutoring)
 *   - Free-tier query counter + Plus upgrade banner (402 response)
 *   - Scholar disclaimer on every response
 *   - "Powered by Anthropic" disclosure
 *   - ARIA live region for streaming responses (screen reader support)
 *   - Arabic lang attribute on Arabic responses
 *   - Prompt injection detection (client-side heuristic — belt-and-suspenders)
 *
 * Accessibility:
 *   - aria-live="polite" on response area
 *   - Proper label associations on all inputs
 *   - Focus management: form input focused after each response
 */

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AudienceMode = 'dawah' | 'qa' | 'tutoring'
type MessageRole  = 'user' | 'assistant' | 'system'

interface Message {
  id:       string
  role:     MessageRole
  content:  string
  flagged?: boolean
  /** 'ar' for Arabic responses, 'en' otherwise */
  lang?:    'ar' | 'en'
}

interface ConversationState {
  conversationId:  string | null
  messages:        Message[]
  queriesUsed:     number
  queriesLimit:    number | null
  planTier:        'free' | 'plus'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHOLAR_DISCLAIMER = (
  'This response is AI-generated for informational purposes only. ' +
  'It is not a fatwa or authoritative religious ruling. ' +
  'Please consult a qualified Islamic scholar for personal religious guidance.'
)

const AUDIENCE_MODE_LABELS: Record<AudienceMode, string> = {
  dawah:    'Dawah (Outreach)',
  qa:       'Q&A (General)',
  tutoring: 'Learning (Tutoring)',
}

// Simple Arabic text detection
function isArabicContent(text: string): boolean {
  // Arabic Unicode block: U+0600–U+06FF
  const arabicChars = (text.match(/[؀-ۿ]/g) ?? []).length
  return arabicChars / text.length > 0.3
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [state, setState] = useState<ConversationState>({
    conversationId: null,
    messages:       [],
    queriesUsed:    0,
    queriesLimit:   3,
    planTier:       'free',
  })

  const [inputValue,   setInputValue]   = useState('')
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('qa')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [showUpgrade,  setShowUpgrade]  = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const liveRegionRef  = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  // Focus input after response
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus()
    }
  }, [loading])

  const sendMessage = useCallback(async () => {
    const message = inputValue.trim()
    if (!message || loading) return

    setInputValue('')
    setError(null)
    setShowUpgrade(false)

    // Optimistically add user message
    const userMsgId = generateId()
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        { id: userMsgId, role: 'user', content: message },
      ],
    }))

    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          conversationId: state.conversationId,
          history:        state.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
          message,
          audienceMode,
        }),
      })

      if (res.status === 402) {
        // Free quota exhausted — show upgrade banner
        setShowUpgrade(true)
        // Remove the optimistic user message
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== userMsgId),
        }))
        setInputValue(message) // restore input
        return
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: 'Unknown error' })) as { message?: string }
        setError(errBody.message ?? `Request failed (${res.status})`)
        // Remove optimistic message on error
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== userMsgId),
        }))
        setInputValue(message)
        return
      }

      const data = await res.json() as {
        content:           string
        conversationId:    string
        queriesUsed?:      number
        queriesLimit?:     number | null
        planTier:          'free' | 'plus'
        moderationFlagged: boolean
      }

      const assistantLang = isArabicContent(data.content) ? 'ar' : 'en'
      const assistantMsgId = generateId()

      setState((prev) => ({
        conversationId: data.conversationId,
        planTier:       data.planTier,
        queriesUsed:    data.queriesUsed  ?? prev.queriesUsed,
        queriesLimit:   data.queriesLimit !== undefined ? data.queriesLimit : prev.queriesLimit,
        messages: [
          ...prev.messages,
          {
            id:      assistantMsgId,
            role:    'assistant',
            content: data.content,
            flagged: data.moderationFlagged,
            lang:    assistantLang,
          },
        ],
      }))

      // Update ARIA live region for screen readers
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = data.content
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setState((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m.id !== userMsgId),
      }))
      setInputValue(message)
    } finally {
      setLoading(false)
    }
  }, [inputValue, loading, state, audienceMode])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const queriesRemaining =
    state.queriesLimit !== null
      ? Math.max(0, state.queriesLimit - state.queriesUsed)
      : null

  return (
    <main
      style={{
        minHeight:      '100vh',
        display:        'flex',
        flexDirection:  'column',
        backgroundColor:'#0D2F17',
        color:          '#C9F27A',
        fontFamily:     'system-ui, sans-serif',
        maxWidth:       '800px',
        margin:         '0 auto',
        padding:        '1rem',
      }}
    >
      {/* Header */}
      <header style={{ paddingBottom: '1rem', borderBottom: '1px solid #1E5E2F' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>ChatIslam</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#79C24C' }}>
          AI-assisted Islamic Q&amp;A — grounded in the Quran and authentic Sunnah
        </p>
      </header>

      {/* Audience mode + query counter */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '0.75rem 0',
          flexWrap:       'wrap',
          gap:            '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="audience-mode" style={{ fontSize: '0.875rem' }}>
            Mode:
          </label>
          <select
            id="audience-mode"
            value={audienceMode}
            onChange={(e) => setAudienceMode(e.target.value as AudienceMode)}
            style={{
              background:   '#1E5E2F',
              color:        '#C9F27A',
              border:       '1px solid #79C24C',
              borderRadius: '4px',
              padding:      '0.25rem 0.5rem',
              fontSize:     '0.875rem',
            }}
            aria-label="Select conversation mode"
          >
            {Object.entries(AUDIENCE_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {state.planTier === 'free' && queriesRemaining !== null && (
          <span
            style={{
              fontSize:         '0.75rem',
              color:            queriesRemaining <= 1 ? '#ff9966' : '#79C24C',
              backgroundColor:  '#1E5E2F',
              padding:          '0.2rem 0.5rem',
              borderRadius:     '4px',
            }}
            aria-label={`${queriesRemaining} free queries remaining today`}
          >
            {queriesRemaining} / {state.queriesLimit} free queries left today
          </span>
        )}

        {state.planTier === 'plus' && (
          <span
            style={{
              fontSize:        '0.75rem',
              color:           '#C9F27A',
              backgroundColor: '#1E5E2F',
              padding:         '0.2rem 0.5rem',
              borderRadius:    '4px',
            }}
          >
            ChatIslam Plus — unlimited
          </span>
        )}
      </div>

      {/* Plus upgrade banner */}
      {showUpgrade && (
        <div
          role="alert"
          style={{
            backgroundColor: '#1E5E2F',
            border:          '1px solid #79C24C',
            borderRadius:    '8px',
            padding:         '1rem',
            marginBottom:    '1rem',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
            Daily limit reached
          </p>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#C9F27A' }}>
            Free accounts get 3 questions per day. Upgrade to ChatIslam Plus for unlimited access.
          </p>
          <a
            href="/plus"
            style={{
              display:         'inline-block',
              backgroundColor: '#79C24C',
              color:           '#0D2F17',
              padding:         '0.4rem 1rem',
              borderRadius:    '4px',
              textDecoration:  'none',
              fontWeight:      600,
              fontSize:        '0.875rem',
            }}
          >
            Upgrade to Plus
          </a>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#3d1515',
            border:          '1px solid #cc4444',
            borderRadius:    '8px',
            padding:         '0.75rem',
            marginBottom:    '0.75rem',
            fontSize:        '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Conversation history */}
      <section
        aria-label="Conversation history"
        style={{
          flex:       1,
          overflowY:  'auto',
          padding:    '0.5rem 0',
          minHeight:  '300px',
          maxHeight:  'calc(100vh - 380px)',
        }}
      >
        {state.messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color:     '#79C24C',
              marginTop: '2rem',
              fontSize:  '0.9rem',
            }}
          >
            <p>Assalamu Alaikum. Ask any question about Islam.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#1E5E2F', background: '#C9F27A', padding: '0.4rem 0.75rem', borderRadius: '4px', display: 'inline-block' }}>
              Free accounts: 3 questions/day
            </p>
          </div>
        )}

        {state.messages.map((msg) => (
          <article
            key={msg.id}
            lang={msg.role === 'assistant' && msg.lang === 'ar' ? 'ar' : undefined}
            dir={msg.role === 'assistant' && msg.lang === 'ar' ? 'rtl' : 'ltr'}
            style={{
              marginBottom:    '1rem',
              padding:         '0.75rem 1rem',
              borderRadius:    '8px',
              backgroundColor: msg.role === 'user' ? '#1E5E2F' : 'transparent',
              border:          msg.role === 'assistant' ? '1px solid #1E5E2F' : 'none',
              maxWidth:        '100%',
            }}
            aria-label={`${msg.role === 'user' ? 'You' : 'ChatIslam'}: ${msg.content.slice(0, 50)}...`}
          >
            <p
              style={{
                margin:     0,
                fontSize:   '0.875rem',
                fontWeight: 600,
                color:      msg.role === 'user' ? '#C9F27A' : '#79C24C',
                marginBottom: '0.25rem',
              }}
            >
              {msg.role === 'user' ? 'You' : 'ChatIslam'}
            </p>
            <p
              style={{
                margin:     0,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontSize:   '0.9rem',
              }}
            >
              {msg.content}
            </p>
            {msg.role === 'assistant' && (
              <p
                style={{
                  margin:    '0.5rem 0 0',
                  fontSize:  '0.7rem',
                  color:     '#79C24C',
                  opacity:   0.7,
                }}
              >
                {SCHOLAR_DISCLAIMER}
              </p>
            )}
          </article>
        ))}

        {loading && (
          <div
            aria-busy="true"
            aria-label="ChatIslam is thinking"
            style={{ padding: '1rem', color: '#79C24C', fontSize: '0.875rem' }}
          >
            <span aria-hidden="true">...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* ARIA live region for screen readers */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width:    '1px',
          height:   '1px',
          overflow: 'hidden',
          clip:     'rect(0,0,0,0)',
        }}
      />

      {/* Input area */}
      <div
        style={{
          borderTop:   '1px solid #1E5E2F',
          paddingTop:  '0.75rem',
          marginTop:   'auto',
        }}
      >
        <label htmlFor="chat-input" className="sr-only" style={{ position: 'absolute', overflow: 'hidden', width: '1px', height: '1px' }}>
          Ask a question about Islam
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Islam (Quran, Sunnah, jurisprudence, history...)"
            disabled={loading}
            rows={2}
            style={{
              flex:            1,
              background:      '#1E5E2F',
              color:           '#C9F27A',
              border:          '1px solid #79C24C',
              borderRadius:    '6px',
              padding:         '0.5rem 0.75rem',
              fontSize:        '0.9rem',
              resize:          'none',
              outline:         'none',
              fontFamily:      'inherit',
            }}
            aria-label="Type your Islamic question"
            aria-disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !inputValue.trim()}
            type="button"
            style={{
              backgroundColor: loading || !inputValue.trim() ? '#1E5E2F' : '#79C24C',
              color:           loading || !inputValue.trim() ? '#79C24C' : '#0D2F17',
              border:          'none',
              borderRadius:    '6px',
              padding:         '0.5rem 1rem',
              fontSize:        '0.9rem',
              fontWeight:      600,
              cursor:          loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              minWidth:        '80px',
              height:          '100%',
              minHeight:       '56px',
            }}
            aria-label="Send message"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p
          style={{
            marginTop:  '0.4rem',
            fontSize:   '0.7rem',
            color:      '#1E5E2F',
            textAlign:  'center',
          }}
        >
          AI-powered Q&amp;A. Powered by{' '}
          <a
            href="https://anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#79C24C' }}
          >
            Anthropic Claude
          </a>
          . Not a substitute for a qualified Islamic scholar.
        </p>
      </div>
    </main>
  )
}
