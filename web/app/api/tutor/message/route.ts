/**
 * ChatIslam — POST /api/tutor/message (CB-03 T20)
 *
 * Streaming SSE tutor message handler.
 * - Requires auth
 * - Validates session ownership
 * - Builds tutor system prompt via tutor-engine.ts
 * - Streams response using claude-sonnet-4-5
 * - Stores partial content for stream recovery
 * - Scores mastery after completion (deterministic, no AI)
 * - Updates session: mastery_scores, level, streak, last_active_at
 * - Rate limit: 20/min per user
 * - Feature flag: FF_AI_TUTOR
 * - Aqeedah guardrails applied to input (SEC-H8)
 * - Spend guard: tracked against CHAT_DAILY_TOKEN_CAP
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  buildTutorSystemPrompt,
  scoreMastery,
  adjustLevel,
  computeStreak,
  type CiTutorSession,
  type CiTutorLesson,
} from '../../../../lib/tutor-engine'
import { storePartialContent } from '../../../../lib/ai-provider'

// Zod schema — T03 AC-01: Priority 2 validation at tutor message boundary
const TutorMessageSchema = z.object({
  session_id: z.string().min(1).optional(),
  message:    z.string().min(1).max(2000).optional(),
  message_id: z.string().optional(),
})

// ─── Redis ────────────────────────────────────────────────────────────────────

interface RedisLike {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>
}

let _redis: RedisLike | null = null

function getRedis(): RedisLike | null {
  if (_redis) return _redis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    const { Redis } = require('ioredis') as { Redis: new (url: string) => RedisLike }
    _redis = new Redis(url)
    return _redis
  } catch {
    return null
  }
}

async function checkRateLimit(key: string): Promise<{ allowed: boolean }> {
  const redis = getRedis()
  if (!redis) return { allowed: true }
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 60)
    return { allowed: count <= 20 }
  } catch {
    return { allowed: true }
  }
}

// ─── Spend guard ──────────────────────────────────────────────────────────────

async function checkSpendGuard(): Promise<boolean> {
  const cap = Number(process.env.CHAT_DAILY_TOKEN_CAP ?? '0')
  if (!cap) return true

  const redis = getRedis()
  if (!redis) return true

  try {
    const today  = new Date().toISOString().slice(0, 10)
    const capKey = `ci:spend:tutor:${today}`
    const used   = Number(await redis.get(capKey) ?? '0')
    return used < cap
  } catch {
    return true
  }
}

async function recordTokenUsage(tokens: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    const today  = new Date().toISOString().slice(0, 10)
    const capKey = `ci:spend:tutor:${today}`
    await redis.incr(capKey as unknown as string)
    // TTL 25h so it expires after the day is well past
    await (redis as unknown as { expire(k: string, s: number): Promise<number> }).expire(capKey, 90000)
    void tokens  // used for future token-exact accounting
  } catch { /* non-blocking */ }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function parseUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  try {
    const token   = auth.slice(7)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const claims  = payload['https://hasura.io/jwt/claims'] ?? {}
    return claims['x-hasura-user-id'] ?? null
  } catch {
    return null
  }
}

// ─── Hasura admin ─────────────────────────────────────────────────────────────

const HASURA_ENDPOINT     = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

async function hasuraQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(HASURA_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body:   JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json() as { data?: T; errors?: Array<{ message: string }> }
  if (data.errors?.length) throw new Error(data.errors[0].message)
  return data.data as T
}

// ─── Aqeedah injection guard (tutor-specific) ─────────────────────────────────

const TUTOR_INJECTION_PATTERNS = [
  /ignore (previous|prior|above|all) instructions/i,
  /forget (your|the) (instructions|guidelines|rules)/i,
  /you are (now|actually) (a|an)/i,
  /pretend (you are|to be)/i,
  /reveal (your|the) system prompt/i,
  /what are your instructions/i,
  /act as if/i,
  /jailbreak/i,
]

function detectTutorInjection(text: string): boolean {
  return TUTOR_INJECTION_PATTERNS.some((p) => p.test(text))
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Feature flag
  if (process.env.FF_AI_TUTOR === 'false') {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 403 })
  }

  // Auth required
  const userId = parseUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  // Rate limit
  const rlKey = `ci:rl:tutor:message:${userId}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  // Spend guard
  const spendOk = await checkSpendGuard()
  if (!spendOk) {
    return NextResponse.json({ error: 'daily_limit_reached' }, { status: 429 })
  }

  // Parse body — Zod safeParse (T03 AC-01)
  const rawBody = await req.json().catch(() => null)
  const parsedBody = TutorMessageSchema.safeParse(rawBody)
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsedBody.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsedBody.data
  const { session_id, message } = body
  if (!session_id || !message || !message.trim()) {
    return NextResponse.json({ error: 'session_id and message are required' }, { status: 400 })
  }

  // SEC-H8: injection guard
  if (detectTutorInjection(message)) {
    return NextResponse.json({
      error:   'invalid_input',
      message: 'Your message contains content that cannot be processed.',
    }, { status: 400 })
  }

  if (!HASURA_ENDPOINT) {
    return NextResponse.json({ error: 'backend_unavailable' }, { status: 503 })
  }

  // Fetch session + current lesson
  let session:  CiTutorSession
  let lesson:   CiTutorLesson

  try {
    const sessionData = await hasuraQuery<{
      ci_tutor_sessions: Array<CiTutorSession & {
        current_lesson: CiTutorLesson | null
      }>
    }>(
      `query($id: uuid!, $user_id: uuid!) {
        ci_tutor_sessions(
          where: { id: { _eq: $id }, user_id: { _eq: $user_id } }
          limit: 1
        ) {
          id user_id path_id current_lesson_id level
          mastery_scores streak_days last_active_at completed_at created_at
          current_lesson: tutor_lesson {
            id path_id lesson_number slug title objective
            system_prompt_addendum mastery_questions prerequisite_lesson_id created_at
          }
        }
      }`,
      { id: session_id, user_id: userId },
    )

    if (!sessionData.ci_tutor_sessions.length) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
    }

    const raw = sessionData.ci_tutor_sessions[0]
    session   = raw
    const currentLesson = raw.current_lesson

    if (!currentLesson) {
      return NextResponse.json({ error: 'no_active_lesson' }, { status: 400 })
    }
    lesson = currentLesson

  } catch (err) {
    console.error('[tutor/message] session fetch error', err)
    return NextResponse.json({ error: 'session_error' }, { status: 500 })
  }

  // Build system prompt + fetch message history
  const systemPrompt = buildTutorSystemPrompt(session, lesson)
  const messageId    = body.message_id ?? crypto.randomUUID()

  // Fetch last 10 tutor messages for context
  let history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  try {
    const msgData = await hasuraQuery<{
      ci_tutor_messages: Array<{ role: string; content: string }>
    }>(
      `query($session_id: uuid!) {
        ci_tutor_messages(
          where:    { session_id: { _eq: $session_id } }
          order_by: { created_at: desc }
          limit:    10
        ) { role content }
      }`,
      { session_id },
    )
    history = (msgData.ci_tutor_messages ?? [])
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  } catch { /* proceed without history */ }

  // Save user message to DB (non-blocking)
  void hasuraQuery(
    `mutation($obj: ci_tutor_messages_insert_input!) {
      insert_ci_tutor_messages_one(object: $obj) { id }
    }`,
    {
      obj: {
        session_id,
        role:    'user',
        content: message,
      },
    },
  ).catch(() => {})

  // ─── Stream response ───────────────────────────────────────────────────────

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const encoder    = new TextEncoder()
  let fullContent  = ''
  let inputTokens  = 0
  let outputTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicMessages: Anthropic.MessageParam[] = [
          ...history,
          { role: 'user', content: message },
        ]

        const streamResponse = await client.messages.stream({
          model:      'claude-sonnet-4-5',
          max_tokens: 1024,
          system:     systemPrompt,
          messages:   anthropicMessages,
        })

        for await (const event of streamResponse) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = event.delta.text
            fullContent += chunk
            const sseData = `data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`
            controller.enqueue(encoder.encode(sseData))

            // Store partial for stream recovery every ~200 chars
            if (fullContent.length % 200 < chunk.length) {
              void storePartialContent(session_id, messageId, fullContent).catch(() => {})
            }
          }

          if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens
          }

          if (event.type === 'message_start' && event.message.usage) {
            inputTokens = event.message.usage.input_tokens
          }
        }

        // Compute mastery score
        const masteryScore   = scoreMastery(message, lesson)
        const updatedScores  = { ...session.mastery_scores, [lesson.id]: masteryScore }
        const updatedSession = { ...session, mastery_scores: updatedScores }
        const newLevel       = adjustLevel(updatedSession)
        const newStreak      = computeStreak(session.streak_days, session.last_active_at)

        // Save assistant message + update session (non-blocking)
        void hasuraQuery(
          `mutation SaveTutorMessage($msg: ci_tutor_messages_insert_input!, $session_id: uuid!, $mastery: jsonb, $level: String, $streak: Int, $last_active: timestamptz) {
            insert_ci_tutor_messages_one(object: $msg) { id }
            update_ci_tutor_sessions(
              where: { id: { _eq: $session_id } }
              _set: {
                mastery_scores: $mastery
                level: $level
                streak_days: $streak
                last_active_at: $last_active
              }
            ) { affected_rows }
          }`,
          {
            msg: { session_id, role: 'assistant', content: fullContent },
            session_id,
            mastery:     updatedScores,
            level:       newLevel,
            streak:      newStreak,
            last_active: new Date().toISOString(),
          },
        ).catch(() => {})

        // Record token usage for spend guard
        void recordTokenUsage(inputTokens + outputTokens)

        // Send completion event
        const doneData = `data: ${JSON.stringify({
          type:          'done',
          message_id:    messageId,
          mastery_score: masteryScore,
          level:         newLevel,
          streak:        newStreak,
        })}\n\n`
        controller.enqueue(encoder.encode(doneData))
        controller.close()

      } catch (err) {
        console.error('[tutor/message] stream error', err)
        const errData = `data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`
        controller.enqueue(encoder.encode(errData))
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Message-Id':      messageId,
      'X-Accel-Buffering': 'no',
    },
  })
}
