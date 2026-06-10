/**
 * ChatIslam — GET /api/tutor/progress (CB-03 T21)
 *
 * Returns tutor progress for the authenticated user across all active sessions.
 * Requires auth. Returns per-path progress with mastery breakdown.
 * Feature flag: FF_AI_TUTOR
 * Rate limit: 30/min per user
 */

import { NextRequest, NextResponse } from 'next/server'

// ─── Redis rate limiter ───────────────────────────────────────────────────────

interface RedisLike {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
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
    return { allowed: count <= 30 }
  } catch {
    return { allowed: true }
  }
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

// ─── Hasura admin client ──────────────────────────────────────────────────────

const HASURA_ENDPOINT     = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

interface TutorSessionWithPath {
  id:                string
  path_id:           string
  current_lesson_id: string | null
  level:             string
  mastery_scores:    Record<string, number>
  streak_days:       number
  last_active_at:    string | null
  completed_at:      string | null
  created_at:        string
  tutor_path: {
    id:             string
    slug:           string
    title:          string
    lessons_aggregate: { aggregate: { count: number } }
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
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
  const rlKey = `ci:rl:tutor:progress:${userId}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  if (!HASURA_ENDPOINT) {
    return NextResponse.json({ error: 'backend_unavailable' }, { status: 503 })
  }

  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query($user_id: uuid!) {
            ci_tutor_sessions(
              where: { user_id: { _eq: $user_id } }
              order_by: { last_active_at: desc_nulls_last }
            ) {
              id
              path_id
              current_lesson_id
              level
              mastery_scores
              streak_days
              last_active_at
              completed_at
              created_at
              tutor_path {
                id
                slug
                title
                lessons_aggregate { aggregate { count } }
              }
            }
          }`,
        variables: { user_id: userId },
      }),
      signal: AbortSignal.timeout(5000),
    })

    const data = await res.json() as {
      data?: { ci_tutor_sessions: TutorSessionWithPath[] }
      errors?: Array<{ message: string }>
    }

    if (data.errors?.length) throw new Error(data.errors[0].message)

    const sessions = data.data?.ci_tutor_sessions ?? []

    const progress = sessions.map((s) => {
      const scores       = Object.values(s.mastery_scores)
      const avgMastery   = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0
      const totalLessons = s.tutor_path.lessons_aggregate.aggregate.count
      const doneLessons  = scores.length

      return {
        session_id:         s.id,
        path_id:            s.path_id,
        path_slug:          s.tutor_path.slug,
        path_title:         s.tutor_path.title,
        current_lesson_id:  s.current_lesson_id,
        level:              s.level,
        avg_mastery:        avgMastery,
        lessons_completed:  doneLessons,
        total_lessons:      totalLessons,
        completion_pct:     totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0,
        streak_days:        s.streak_days,
        last_active_at:     s.last_active_at,
        completed_at:       s.completed_at,
        started_at:         s.created_at,
      }
    })

    return NextResponse.json({ progress })

  } catch (err) {
    console.error('[tutor/progress] error', err)
    return NextResponse.json({ error: 'progress_fetch_failed' }, { status: 500 })
  }
}
