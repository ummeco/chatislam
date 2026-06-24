/**
 * ChatIsland.tsx — AI chat React 19 island (client:load)
 *
 * PURPOSE: Interactive AI chat surface for chatislam.org.
 *   Astro island pattern: this React component is the ONLY client-side
 *   JavaScript on the /chat page. All other content is static Astro HTML.
 *
 * INPUTS:
 *   - locale: BCP47 locale string for RTL detection and i18n
 *   - turnstileSiteKey: Cloudflare Turnstile public site key (D-P3-20)
 *   - chatProxyUrl: Cloudflare Worker URL for rate-limit + Turnstile verify
 *
 * OUTPUTS: Full interactive chat UI — 7 UI states (loading/empty/error/populated/
 *          offline/permission-denied/rate-limited), Turnstile CAPTCHA, RTL support.
 *
 * CONSTRAINTS:
 *   - No Next.js or next/* imports.
 *   - No hCaptcha — Turnstile only (D-P3-20).
 *   - No GlitchTip — Sentry only (D-P2-SENTRY-SOT).
 *   - Theology gate: ahl us-sunnah umbrella enforced server-side (system prompt).
 *   - ANTHROPIC_API_KEY stays server-side in CF Worker proxy.
 *
 * REF: P2-E3-W02-S02-T02 · D-P2-STACK-CANON · D-P3-20
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────

type ChatUIState =
  | 'empty'            // No messages yet (initial)
  | 'loading'          // Waiting for AI response
  | 'populated'        // Has messages, idle
  | 'error'            // Request failed
  | 'offline'          // Network offline
  | 'permission-denied' // Turnstile failed / bot rejected
  | 'rate-limited'     // 429 from CF Worker

type AudienceMode = 'qa' | 'dawah' | 'tutoring'
type MessageRole  = 'user' | 'assistant'

interface Message {
  id:      string
  role:    MessageRole
  content: string
  /** True if theology gate flagged the response */
  flagged?: boolean
  /** 'ar' for Arabic responses */
  lang?: 'ar' | 'en'
}

interface ChatState {
  messages:       Message[]
  conversationId: string | null
  queriesUsed:    number
  queriesLimit:   number | null
  planTier:       'free' | 'plus'
}

export interface ChatIslandProps {
  locale:           string
  turnstileSiteKey: string
  chatProxyUrl:     string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AUDIENCE_LABELS: Record<AudienceMode, string> = {
  qa:       'Q&A (General)',
  dawah:    'Dawah (Outreach)',
  tutoring: 'Learning (Tutoring)',
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function isArabic(text: string): boolean {
  const arabicChars = (text.match(/[؀-ۿ]/g) ?? []).length
  return arabicChars / text.length > 0.3
}

const RTL_LOCALES = new Set(['ar', 'ur', 'fa'])

function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale.split('-')[0] ?? '')
}

// ─── Turnstile CAPTCHA widget ────────────────────────────────────────────────

interface TurnstileWidgetProps {
  siteKey: string
  onSuccess: (token: string) => void
  onError: () => void
}

function TurnstileWidget({ siteKey, onSuccess, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef  = useRef<string | null>(null)

  useEffect(() => {
    // Lazy-load Turnstile script once
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script')
      script.src = TURNSTILE_SCRIPT
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    // Render widget once Turnstile is available
    const tryRender = () => {
      if (!containerRef.current) return
      if (!(window as Window & { turnstile?: TurnstileAPI }).turnstile) {
        setTimeout(tryRender, 300)
        return
      }
      widgetIdRef.current = (window as Window & { turnstile?: TurnstileAPI }).turnstile!.render(
        containerRef.current,
        {
          sitekey:  siteKey,
          callback: onSuccess,
          'error-callback': onError,
          'expired-callback': onError,
          theme: 'dark',
        },
      )
    }
    tryRender()

    return () => {
      if (widgetIdRef.current && (window as Window & { turnstile?: TurnstileAPI }).turnstile) {
        (window as Window & { turnstile?: TurnstileAPI }).turnstile!.remove(widgetIdRef.current)
      }
    }
  }, [siteKey, onSuccess, onError])

  return <div ref={containerRef} aria-label="Bot verification challenge" />
}

interface TurnstileAPI {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

// ─── UI State Renderers ──────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      role="status"
      aria-label="Chat is ready"
      style={{ textAlign: 'center', padding: '2rem', color: 'var(--brand-green-mid)' }}
    >
      <p style={{ fontSize: '1rem' }}>
        Ask any question about Islam — Q&amp;A, dawah, or learning.
      </p>
      <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
        All answers are grounded in Quran and authentic Sunnah.
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="AI is composing a response"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
    >
      <span className="sr-only">AI is responding…</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-green-mid)',
            animation: `ci-dot-bounce 400ms ease-in-out ${i * 133}ms infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

interface ErrorStateProps { message: string }
function ErrorState({ message }: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding:         '0.75rem',
        backgroundColor: 'rgba(255,60,60,0.15)',
        border:          '1px solid rgba(255,60,60,0.4)',
        borderRadius:    '6px',
        color:           '#ff9966',
        fontSize:        '0.875rem',
      }}
    >
      {message}
    </div>
  )
}

function OfflineState() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding:         '0.75rem',
        backgroundColor: 'rgba(255,165,0,0.1)',
        border:          '1px solid rgba(255,165,0,0.4)',
        borderRadius:    '6px',
        color:           '#ffaa44',
        fontSize:        '0.875rem',
      }}
    >
      You appear to be offline. Please check your connection and try again.
    </div>
  )
}

function PermissionDeniedState() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding:         '0.75rem',
        backgroundColor: 'rgba(255,60,60,0.1)',
        border:          '1px solid rgba(255,60,60,0.3)',
        borderRadius:    '6px',
        color:           '#ff9966',
        fontSize:        '0.875rem',
      }}
    >
      Bot verification failed. Please refresh the page and try again.
    </div>
  )
}

function RateLimitedState() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding:         '0.75rem',
        backgroundColor: 'rgba(201,242,122,0.1)',
        border:          '1px solid rgba(201,242,122,0.3)',
        borderRadius:    '6px',
        color:           'var(--brand-green-light)',
        fontSize:        '0.875rem',
      }}
    >
      You have reached your free query limit for today. JazakAllah khayran for using ChatIslam!{' '}
      Support us at{' '}
      <a href="/donate" style={{ color: 'var(--brand-green-mid)' }}>
        chatislam.org/donate
      </a>
      .
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser     = message.role === 'user'
  const isArabicMsg = message.lang === 'ar'

  return (
    <article
      aria-label={isUser ? 'Your message' : 'ChatIslam response'}
      lang={isArabicMsg ? 'ar' : undefined}
      dir={isArabicMsg ? 'rtl' : undefined}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     isUser ? 'flex-end' : 'flex-start',
        marginBottom:   '0.75rem',
      }}
    >
      <div
        style={{
          maxWidth:        '85%',
          padding:         '0.625rem 0.875rem',
          borderRadius:    isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          backgroundColor: isUser ? 'var(--brand-green-dark)' : 'rgba(201,242,122,0.08)',
          border:          isUser ? 'none' : '1px solid rgba(201,242,122,0.2)',
          fontSize:        '0.9rem',
          lineHeight:      '1.6',
          color:           'var(--brand-green-light)',
          whiteSpace:      'pre-wrap',
          wordBreak:       'break-word',
        }}
      >
        {message.content}
        {message.flagged && (
          <p
            style={{
              marginTop:  '0.375rem',
              fontSize:   '0.7rem',
              color:      '#ffaa44',
              fontStyle:  'italic',
            }}
          >
            ⚠️ This response was flagged for review. Please consult a qualified scholar.
          </p>
        )}
      </div>

      {!isUser && (
        <p style={{ fontSize: '0.65rem', color: 'rgba(201,242,122,0.4)', margin: '0.25rem 0 0 0.25rem' }}>
          AI-generated · not a fatwa · consult a scholar for binding rulings
        </p>
      )}
    </article>
  )
}

// ─── Main Island Component ───────────────────────────────────────────────────

export default function ChatIsland({ locale, turnstileSiteKey, chatProxyUrl }: ChatIslandProps) {
  const isRtl = isRtlLocale(locale)

  const [uiState,      setUiState]      = useState<ChatUIState>('empty')
  const [chat,         setChat]         = useState<ChatState>({
    messages:       [],
    conversationId: null,
    queriesUsed:    0,
    queriesLimit:   3,
    planTier:       'free',
  })
  const [input,        setInput]        = useState('')
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('qa')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const liveRegionRef  = useRef<HTMLDivElement>(null)

  // Track online/offline
  useEffect(() => {
    const goOffline = () => {
      if (uiState !== 'loading') setUiState('offline')
    }
    const goOnline = () => {
      if (uiState === 'offline') setUiState(chat.messages.length > 0 ? 'populated' : 'empty')
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [uiState, chat.messages.length])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  // Focus input after response
  useEffect(() => {
    if (uiState !== 'loading') inputRef.current?.focus()
  }, [uiState])

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const handleTurnstileError = useCallback(() => {
    setUiState('permission-denied')
    setTurnstileToken(null)
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || uiState === 'loading') return
    if (!navigator.onLine) { setUiState('offline'); return }

    setInput('')
    setErrorMsg('')
    const userMsgId = generateId()

    setChat((prev) => ({
      ...prev,
      messages: [...prev.messages, { id: userMsgId, role: 'user', content: text }],
    }))
    setUiState('loading')

    try {
      const body: Record<string, unknown> = {
        conversationId: chat.conversationId,
        history: chat.messages
          .filter((m) => m.role !== ('system' as MessageRole))
          .map((m) => ({ role: m.role, content: m.content })),
        message:      text,
        audienceMode,
      }

      // Include Turnstile token if available (D-P3-20)
      if (turnstileToken) body.turnstileToken = turnstileToken

      const res = await fetch(chatProxyUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (res.status === 429) {
        // Remove optimistic user message; show rate-limit state
        setChat((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== userMsgId),
        }))
        setInput(text)
        setUiState('rate-limited')
        return
      }

      if (res.status === 403) {
        setChat((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== userMsgId),
        }))
        setInput(text)
        setUiState('permission-denied')
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `Request failed (${res.status})` })) as { message?: string }
        setErrorMsg(err.message ?? `Request failed (${res.status})`)
        setChat((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== userMsgId),
        }))
        setInput(text)
        setUiState('error')
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

      const lang           = isArabic(data.content) ? 'ar' : 'en'
      const assistantMsgId = generateId()

      setChat({
        conversationId: data.conversationId,
        planTier:       data.planTier,
        queriesUsed:    data.queriesUsed  ?? chat.queriesUsed,
        queriesLimit:   data.queriesLimit !== undefined ? data.queriesLimit : chat.queriesLimit,
        messages: [
          ...chat.messages.filter((m) => m.id !== userMsgId).concat({ id: userMsgId, role: 'user', content: text }),
          {
            id:      assistantMsgId,
            role:    'assistant',
            content: data.content,
            flagged: data.moderationFlagged,
            lang,
          },
        ],
      })

      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = data.content
      }

      setUiState('populated')
    } catch (err) {
      if (!navigator.onLine) {
        setUiState('offline')
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to send message')
        setUiState('error')
      }
      setChat((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m.id !== userMsgId),
      }))
      setInput(text)
    }
  }, [input, uiState, chat, audienceMode, chatProxyUrl, turnstileToken])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const queriesRemaining =
    chat.queriesLimit !== null ? Math.max(0, chat.queriesLimit - chat.queriesUsed) : null

  return (
    <main
      id="main-content"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label="ChatIslam AI chat"
      style={{
        display:        'flex',
        flexDirection:  'column',
        height:         'calc(100vh - 120px)',
        maxWidth:       '800px',
        margin:         '0 auto',
        padding:        '0 1rem 1rem',
        gap:            '0.5rem',
      }}
    >
      {/* Mode selector + quota counter */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '0.5rem 0',
          flexWrap:       'wrap',
          gap:            '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="audience-mode" style={{ fontSize: '0.875rem' }}>Mode:</label>
          <select
            id="audience-mode"
            value={audienceMode}
            onChange={(e) => setAudienceMode(e.target.value as AudienceMode)}
            aria-label="Select conversation mode"
            style={{
              background:   'var(--brand-green-dark)',
              color:        'var(--brand-green-light)',
              border:       '1px solid var(--brand-green-mid)',
              borderRadius: '4px',
              padding:      '0.25rem 0.5rem',
              fontSize:     '0.875rem',
            }}
          >
            {(Object.entries(AUDIENCE_LABELS) as [AudienceMode, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {chat.planTier === 'free' && queriesRemaining !== null && (
          <span
            aria-label={`${queriesRemaining} free queries remaining today`}
            style={{
              fontSize:        '0.75rem',
              color:           queriesRemaining <= 1 ? '#ff9966' : 'var(--brand-green-mid)',
              backgroundColor: 'var(--brand-green-dark)',
              padding:         '0.2rem 0.5rem',
              borderRadius:    '4px',
            }}
          >
            {queriesRemaining} / {chat.queriesLimit} free queries left today
          </span>
        )}
      </div>

      {/* Messages list */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
        style={{
          flex:           1,
          overflowY:      'auto',
          padding:        '0.5rem',
          display:        'flex',
          flexDirection:  'column',
          gap:            '0.25rem',
          border:         '1px solid var(--brand-green-dark)',
          borderRadius:   '8px',
        }}
      >
        {/* UI State renderers */}
        {uiState === 'empty'             && <EmptyState />}
        {uiState === 'offline'           && <OfflineState />}
        {uiState === 'permission-denied' && <PermissionDeniedState />}
        {uiState === 'rate-limited'      && <RateLimitedState />}
        {uiState === 'error'             && <ErrorState message={errorMsg || 'Something went wrong. Please try again.'} />}

        {/* Messages (populated + loading states) */}
        {chat.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {uiState === 'loading' && <LoadingState />}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ARIA live region for screen readers */}
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
      />

      {/* Turnstile CAPTCHA (D-P3-20) — shown when no token yet */}
      {!turnstileToken && (
        <TurnstileWidget
          siteKey={turnstileSiteKey}
          onSuccess={handleTurnstileSuccess}
          onError={handleTurnstileError}
        />
      )}

      {/* Input area */}
      <div
        style={{
          display:     'flex',
          gap:         '0.5rem',
          alignItems:  'flex-end',
          borderTop:   '1px solid var(--brand-green-dark)',
          paddingTop:  '0.75rem',
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask a question about Islam
        </label>
        <textarea
          ref={inputRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about Islam…"
          rows={2}
          disabled={uiState === 'loading'}
          aria-disabled={uiState === 'loading'}
          style={{
            flex:            1,
            background:      'var(--brand-green-dark)',
            color:           'var(--brand-green-light)',
            border:          '1px solid var(--brand-green-mid)',
            borderRadius:    '6px',
            padding:         '0.625rem 0.75rem',
            fontSize:        '0.9rem',
            resize:          'none',
            lineHeight:      '1.5',
            fontFamily:      'inherit',
            outline:         'none',
          }}
          dir={isRtl ? 'rtl' : 'ltr'}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || uiState === 'loading' || !turnstileToken}
          aria-label="Send message"
          style={{
            background:    input.trim() && uiState !== 'loading' && turnstileToken
              ? 'var(--brand-green-mid)'
              : 'var(--brand-green-dark)',
            color:         'var(--brand-green-deep)',
            border:        'none',
            borderRadius:  '6px',
            padding:       '0.625rem 1rem',
            fontSize:      '0.9rem',
            fontWeight:    600,
            cursor:        !input.trim() || uiState === 'loading' || !turnstileToken ? 'not-allowed' : 'pointer',
            whiteSpace:    'nowrap',
            alignSelf:     'stretch',
            opacity:       !input.trim() || uiState === 'loading' || !turnstileToken ? 0.5 : 1,
            transition:    'background 150ms ease, opacity 150ms ease',
          }}
        >
          {uiState === 'loading' ? 'Sending…' : 'Send'}
        </button>
      </div>

      {/* "Powered by Anthropic" disclosure */}
      <p style={{ fontSize: '0.65rem', color: 'rgba(201,242,122,0.35)', textAlign: 'center', margin: 0 }}>
        Powered by Anthropic · Ahl us-Sunnah wal-Jamaah content guidelines apply
      </p>
    </main>
  )
}
