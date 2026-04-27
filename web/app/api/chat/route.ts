/**
 * ChatIslam — /api/chat POST handler
 * Sprint 10 — T1-10-02 (quota) + T1-10-01 (anthropic wrapper)
 *
 * Flow:
 *   1. Middleware rate limit (handled by middleware.ts — 5 req/min anon, 30 auth)
 *   2. Parse + validate request body
 *   3. Detect plan tier from session (Plus = unlimited, Free = 3/day)
 *   4. Query quota gate — 402 on 4th free query
 *   5. Call Anthropic wrapper (includes spend guard + theological guardrails)
 *   6. Persist messages via Hasura GraphQL mutation
 *   7. Return response JSON
 *
 * Error responses:
 *   400 — missing/invalid body or prompt injection attempt
 *   402 — free quota exhausted (upgrade banner signal)
 *   429 — Anthropic API rate limit (upstream 429 bubbled up)
 *   503 — platform-wide Anthropic spend cap exceeded
 *   500 — unexpected server error
 *
 * Authentication:
 *   Session cookie (Hasura Auth JWT) is parsed if present.
 *   Anonymous requests are allowed for free tier.
 *
 * Note: Streaming (stream: true) is deferred to Sprint 10 Phase 2.
 * This initial implementation returns the full response as JSON.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { checkQueryGate } from '../../../lib/chatislam-query-gate'
import { AnthropicSpendCapExceeded } from '../../../../ummat/backend/src/lib/anthropic-spend-guard'

// Re-export types used in tests
export type { ChatRequestBody, ChatResponseBody }

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  conversationId?: string
  history?:        ChatMessage[]
  message:         string
  audienceMode?:   'dawah' | 'qa' | 'tutoring'
}

interface ChatResponseBody {
  content:           string
  conversationId:    string
  queriesUsed?:      number
  queriesLimit?:     number | null
  planTier:          'free' | 'plus'
  moderationFlagged: boolean
  cacheHit:          boolean
  inputTokens:       number
  outputTokens:      number
}

// ─── Lazy singletons ─────────────────────────────────────────────────────────

let _redis: import('ioredis').Redis | null = null

function getRedis(): import('ioredis').Redis {
  if (_redis) return _redis
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL not set')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require('ioredis') as { Redis: new (url: string) => import('ioredis').Redis }
  _redis = new Redis(url)
  return _redis
}

let _wrapper: import('../../../../ummat/backend/src/lib/anthropic-wrapper').AnthropicWrapper | null = null

async function getWrapper() {
  if (_wrapper) return _wrapper
  const { AnthropicWrapper } = await import(
    '../../../../ummat/backend/src/lib/anthropic-wrapper'
  )
  _wrapper = new AnthropicWrapper({ redis: getRedis() })
  return _wrapper
}

// ─── IP hashing ───────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? '')).digest('hex')
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') ?? ''
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}

// ─── Session parsing ──────────────────────────────────────────────────────────

interface SessionInfo {
  userId:    string | null
  planTier:  'free' | 'plus'
}

function parseSession(req: NextRequest): SessionInfo {
  // Hasura Auth sets Authorization: Bearer <JWT>
  // JWT claims include x-hasura-user-id and x-hasura-default-role
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return { userId: null, planTier: 'free' }
  }

  try {
    const token   = auth.slice(7)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const claims  = payload['https://hasura.io/jwt/claims'] ?? {}
    const userId  = claims['x-hasura-user-id'] ?? null
    const role    = claims['x-hasura-default-role'] ?? 'user'
    const planTier: 'free' | 'plus' = role === 'plus' ? 'plus' : 'free'
    return { userId, planTier }
  } catch {
    return { userId: null, planTier: 'free' }
  }
}

// ─── Hasura persist helper ────────────────────────────────────────────────────

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT ?? 'https://api.ummat.dev/v1/graphql'
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET ?? ''

async function persistMessage(args: {
  conversationId: string
  role:           'user' | 'assistant' | 'system'
  content:        string
  inputTokens?:   number
  outputTokens?:  number
  costUsd?:       number
  modelId?:       string
  flagged?:       boolean
}): Promise<void> {
  const mutation = `
    mutation InsertCiMessage($object: ci_message_insert_input!) {
      insert_ci_message_one(object: $object) { id }
    }
  `
  const variables = {
    object: {
      conversation_id:          args.conversationId,
      role:                     args.role,
      content:                  args.content,
      anthropic_input_tokens:   args.inputTokens  ?? null,
      anthropic_output_tokens:  args.outputTokens ?? null,
      anthropic_cost_usd:       args.costUsd      ?? null,
      model_id:                 args.modelId      ?? null,
      moderation_flagged:       args.flagged      ?? false,
    },
  }

  const res = await fetch(HASURA_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':           'application/json',
      'x-hasura-admin-secret':  HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query: mutation, variables }),
  })

  if (!res.ok) {
    console.error('[chat/route] Hasura persist failed', { status: res.status })
    // Non-blocking: persist failure does not fail the request
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse body
  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.message || typeof body.message !== 'string' || body.message.trim() === '') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // 2. Session + plan tier
  const { userId, planTier } = parseSession(req)
  const clientIp             = getClientIp(req)
  const ipHash               = hashIp(clientIp)

  // 3. Query gate
  let gateResult
  try {
    gateResult = await checkQueryGate({
      redis:    getRedis(),
      ipHash,
      userId,
      planTier,
    })
  } catch {
    // Gate error — fail open
    gateResult = { allowed: true, queriesUsed: 0, queriesLimit: FREE_TIER_DAILY_LIMIT, planTier }
  }

  if (!gateResult.allowed) {
    return NextResponse.json(
      {
        error:        'daily_quota_exceeded',
        message:      'You have used all 3 free queries for today. Upgrade to ChatIslam Plus for unlimited access.',
        queriesUsed:  gateResult.queriesUsed,
        queriesLimit: gateResult.queriesLimit,
        planTier:     'free',
        upgradeUrl:   '/plus',
      },
      {
        status: 402,
        headers: { 'X-RateLimit-Remaining': '0' },
      },
    )
  }

  // 4. Ensure conversation exists (create new if needed)
  const conversationId = body.conversationId ?? crypto.randomUUID()

  // 5. Call Anthropic wrapper
  try {
    const wrapper = await getWrapper()
    const result  = await wrapper.chat(
      conversationId,
      body.history ?? [],
      body.message.trim(),
      persistMessage,
    )

    const response: ChatResponseBody = {
      content:           result.content,
      conversationId,
      queriesUsed:       gateResult.queriesUsed,
      queriesLimit:      gateResult.queriesLimit,
      planTier,
      moderationFlagged: result.moderationFlagged,
      cacheHit:          result.cacheHit,
      inputTokens:       result.inputTokens,
      outputTokens:      result.outputTokens,
    }

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Remaining': String(
          gateResult.queriesLimit !== null
            ? Math.max(0, gateResult.queriesLimit - (gateResult.queriesUsed ?? 0))
            : 999,
        ),
      },
    })
  } catch (err) {
    if (err instanceof AnthropicSpendCapExceeded) {
      return NextResponse.json(
        {
          error:   'service_unavailable',
          message: 'The AI service is temporarily paused. Please try again after midnight UTC.',
        },
        { status: 503 },
      )
    }

    // Prompt injection
    if (err instanceof Error && err.name === 'PromptInjectionAttemptError') {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Request could not be processed.' },
        { status: 400 },
      )
    }

    // Anthropic 429 rate limit
    if (err instanceof Error && 'status' in err && (err as { status: number }).status === 429) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'AI service rate limit reached. Please try again in a moment.' },
        { status: 429 },
      )
    }

    console.error('[chat/route] Unexpected error', err)
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred.' },
      { status: 500 },
    )
  }
}

// Constant re-export for test access
const FREE_TIER_DAILY_LIMIT = 3
