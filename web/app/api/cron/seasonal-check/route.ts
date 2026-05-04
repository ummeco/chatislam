/**
 * ChatIslam — POST /api/cron/seasonal-check (CB-05 T34b)
 *
 * Cron job endpoint that recomputes Islamic seasonal mode from the Hijri calendar
 * and updates ci_seasonal_config.is_active accordingly.
 *
 * Called by Vercel Cron (vercel.json) — see vercel.json configuration.
 * Auth: CRON_SECRET header required (Vercel Cron injects it automatically).
 * Invalidates Redis cache ci:seasonal:status on update.
 *
 * Schedule: twice daily (0 0,12 * * *)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSeasonalMode, type SeasonalMode } from '../../../../lib/seasonal'

// ─── Redis ────────────────────────────────────────────────────────────────────

interface RedisLike {
  del(key: string): Promise<number>
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

const ALL_MODES: SeasonalMode[] = ['ramadan', 'eid_al_fitr', 'eid_al_adha', 'dhul_hijjah']

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth: Vercel cron secret
  const cronSecret = req.headers.get('authorization')
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!HASURA_ENDPOINT) {
    return NextResponse.json({ error: 'backend_unavailable' }, { status: 503 })
  }

  // Feature flag (still runs even if off — turns everything inactive)
  const featureEnabled = process.env.FF_SEASONAL_MODE !== 'false'

  let activeMode: SeasonalMode | null = null
  if (featureEnabled) {
    activeMode = await getCurrentSeasonalMode()
  }

  const now = new Date().toISOString()
  const results: Record<string, string> = {}

  try {
    // Update each mode: activate the current one, deactivate all others
    for (const mode of ALL_MODES) {
      const shouldBeActive = mode === activeMode

      const result = await hasuraQuery<{
        update_ci_seasonal_config: { affected_rows: number }
      }>(
        `mutation($mode: String!, $is_active: Boolean!, $activated_at: timestamptz, $deactivated_at: timestamptz) {
          update_ci_seasonal_config(
            where: { mode: { _eq: $mode } }
            _set: {
              is_active:      $is_active
              activated_at:   $activated_at
              deactivated_at: $deactivated_at
            }
          ) { affected_rows }
        }`,
        {
          mode,
          is_active:      shouldBeActive,
          activated_at:   shouldBeActive ? now : null,
          deactivated_at: shouldBeActive ? null : now,
        },
      )

      results[mode] = shouldBeActive ? 'activated' : 'deactivated'
      void result  // type-used
    }

    // Invalidate Redis cache
    const redis = getRedis()
    if (redis) {
      try {
        await redis.del('ci:seasonal:status')
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      active_mode: activeMode,
      updated:     results,
      checked_at:  now,
    })

  } catch (err) {
    console.error('[cron/seasonal-check] error', err)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
}
