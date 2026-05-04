/**
 * ChatIslam — POST /api/tutor/session (CB-03 T19)
 *
 * Create or resume a tutor session for the authenticated user.
 * Requires auth (Bearer JWT). Returns existing session if one exists for user+path.
 * Feature flag: FF_AI_TUTOR
 * Rate limit: 20/min per user
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

async function hasuraQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(HASURA_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body:   JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(5000),
  })
  const data = await res.json() as { data?: T; errors?: Array<{ message: string }> }
  if (data.errors?.length) throw new Error(data.errors[0].message)
  return data.data as T
}

interface TutorSession {
  id:                string
  user_id:           string
  path_id:           string
  current_lesson_id: string | null
  level:             string
  mastery_scores:    Record<string, number>
  streak_days:       number
  last_active_at:    string | null
  completed_at:      string | null
  created_at:        string
}

interface TutorPath {
  id:    string
  slug:  string
  title: string
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
  const rlKey = `ci:rl:tutor:session:${userId}`
  const rl    = await checkRateLimit(rlKey)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  // Parse body
  let body: { path_id?: string }
  try {
    body = (await req.json()) as { path_id?: string }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { path_id } = body
  if (!path_id || typeof path_id !== 'string') {
    return NextResponse.json({ error: 'path_id is required' }, { status: 400 })
  }

  if (!HASURA_ENDPOINT) {
    return NextResponse.json({ error: 'backend_unavailable' }, { status: 503 })
  }

  try {
    // Verify path exists and is active
    const pathData = await hasuraQuery<{ ci_tutor_paths: TutorPath[] }>(
      `query($id: uuid!) {
        ci_tutor_paths(where: { id: { _eq: $id }, is_active: { _eq: true } }, limit: 1) {
          id slug title
        }
      }`,
      { id: path_id },
    )

    if (!pathData.ci_tutor_paths.length) {
      return NextResponse.json({ error: 'path_not_found' }, { status: 404 })
    }

    // Check for existing session
    const existingData = await hasuraQuery<{ ci_tutor_sessions: TutorSession[] }>(
      `query($user_id: uuid!, $path_id: uuid!) {
        ci_tutor_sessions(
          where: { user_id: { _eq: $user_id }, path_id: { _eq: $path_id } }
          limit: 1
        ) {
          id user_id path_id current_lesson_id level
          mastery_scores streak_days last_active_at completed_at created_at
        }
      }`,
      { user_id: userId, path_id },
    )

    if (existingData.ci_tutor_sessions.length > 0) {
      return NextResponse.json({
        session:  existingData.ci_tutor_sessions[0],
        resumed:  true,
      })
    }

    // Get first lesson of the path
    const lessonData = await hasuraQuery<{
      ci_tutor_lessons: Array<{ id: string }>
    }>(
      `query($path_id: uuid!) {
        ci_tutor_lessons(
          where:    { path_id: { _eq: $path_id } }
          order_by: { lesson_number: asc }
          limit:    1
        ) { id }
      }`,
      { path_id },
    )

    const firstLessonId = lessonData.ci_tutor_lessons[0]?.id ?? null

    // Create new session
    const createData = await hasuraQuery<{ insert_ci_tutor_sessions_one: TutorSession }>(
      `mutation($obj: ci_tutor_sessions_insert_input!) {
        insert_ci_tutor_sessions_one(object: $obj) {
          id user_id path_id current_lesson_id level
          mastery_scores streak_days last_active_at completed_at created_at
        }
      }`,
      {
        obj: {
          user_id:           userId,
          path_id,
          current_lesson_id: firstLessonId,
          level:             'beginner',
          mastery_scores:    {},
          streak_days:       0,
          last_active_at:    null,
        },
      },
    )

    return NextResponse.json({
      session: createData.insert_ci_tutor_sessions_one,
      resumed: false,
    }, { status: 201 })

  } catch (err) {
    console.error('[tutor/session] error', err)
    return NextResponse.json({ error: 'session_error' }, { status: 500 })
  }
}
