/**
 * ChatIslam — Citation Contract: Islam.wiki ↔ ChatIslam (CB-06 T38)
 *
 * Citation URL schema (islam.wiki canonical):
 *   https://islam.wiki/{content-type}/{slug}
 *   content-type: quran | hadith | scholar | fatwa | concept | article
 *
 * Citation confidence levels:
 *   verified  — URL resolves on islam.wiki
 *   pending   — URL expected but article not yet published
 *   external  — source is external (islamqa.com, AMJA, etc.)
 */

import crypto from 'crypto'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type CitationType = 'quran' | 'hadith' | 'fatwa' | 'scholar' | 'article'
export type CitationConfidence = 'verified' | 'pending' | 'external'

export interface Citation {
  type:       CitationType
  display:    string
  url:        string | null
  madhhab?:   string
  confidence: CitationConfidence
}

// ─── Redis for citation cache ────────────────────────────────────────────────────

interface RedisLike {
  get(key: string): Promise<string | null>
  setex(key: string, seconds: number, value: string): Promise<unknown>
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

function getCacheTtl(): number {
  return Number(process.env.CITATION_CACHE_TTL_SECONDS ?? '3600')
}

// ─── Islam.wiki citation URL verification ────────────────────────────────────────

/**
 * Verify that an islam.wiki URL exists.
 * Results are cached in Redis: ci:cite:{sha256(url)}
 *
 * Called server-side by Feynman agent only — not per chat message.
 */
export async function verifyCitationUrl(url: string): Promise<{ exists: boolean; title: string | null }> {
  const hash     = crypto.createHash('sha256').update(url).digest('hex')
  const cacheKey = `ci:cite:${hash}`
  const ttl      = getCacheTtl()

  // Check cache
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null) return JSON.parse(cached) as { exists: boolean; title: string | null }
    } catch { /* proceed */ }
  }

  // Verify against islamwiki API
  const apiUrl = process.env.ISLAMWIKI_CITATION_API ?? 'https://islam.wiki/api/citation'
  let result: { exists: boolean; title: string | null } = { exists: false, title: null }

  try {
    const res = await fetch(`${apiUrl}?url=${encodeURIComponent(url)}`, {
      method:  'GET',
      headers: { 'Accept': 'application/json' },
      signal:  AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json() as { exists?: boolean; title?: string | null }
      result = {
        exists: data.exists === true,
        title:  data.title ?? null,
      }
    }
  } catch { /* treat as not existing */ }

  // Cache result
  if (redis) {
    try {
      await redis.setex(cacheKey, ttl, JSON.stringify(result))
    } catch { /* non-blocking */ }
  }

  return result
}

// ─── Citation override check ─────────────────────────────────────────────────────

/**
 * Check ci_citation_overrides for a redirect URL.
 * Returns the new URL if found, null otherwise.
 * Uses adminClient (server-side only).
 */
export async function checkOverride(url: string): Promise<string | null> {
  const HASURA_ENDPOINT    = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
  const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

  if (!HASURA_ENDPOINT) return null

  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query($old_url: String!) {
            ci_citation_overrides(where: { old_url: { _eq: $old_url } }, limit: 1) {
              new_url
            }
          }`,
        variables: { old_url: url },
      }),
    })
    const data = await res.json() as {
      data?: { ci_citation_overrides?: Array<{ new_url: string }> }
    }
    return data.data?.ci_citation_overrides?.[0]?.new_url ?? null
  } catch {
    return null
  }
}

// ─── Citation display text formatter ────────────────────────────────────────────

export function buildCitationText(citation: Citation): string {
  if (citation.madhhab) {
    return `${citation.display} (${citation.madhhab})`
  }
  return citation.display
}

// ─── Confidence determination ────────────────────────────────────────────────────

/**
 * Determine citation confidence based on URL and islam.wiki verification result.
 */
export function determineCitationConfidence(
  url:    string | null,
  exists: boolean,
): CitationConfidence {
  if (!url) return 'external'
  const baseUrl = process.env.ISLAMWIKI_BASE_URL ?? 'https://islam.wiki'
  if (!url.startsWith(baseUrl)) return 'external'
  return exists ? 'verified' : 'pending'
}

// ─── IslamQA corpus query (T03-P9) ───────────────────────────────────────────

export interface IslamQAMatch {
  /** DB UUID of the question */
  questionId:  string
  titleEn:     string
  bodyEn:      string | null
  category:    string | null
  sourceUrl:   string | null
  madhabTags:  string[]
}

/**
 * Full-text search ci_islamqa_questions for the top-3 closest matches.
 *
 * Used server-side only (admin secret). Falls back gracefully to empty array
 * on any error — never blocks the chat response.
 *
 * @param query  The user's query string (pre-sanitized)
 * @returns      Up to 3 IslamQA question matches as Citation sources
 */
export async function queryIslamQACorpus(query: string): Promise<IslamQAMatch[]> {
  const HASURA_ENDPOINT    = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
  const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

  if (!HASURA_ENDPOINT) return []

  const GQL = `
    query SearchIslamQA($query: String!) {
      ci_islamqa_questions(
        where: {
          _or: [
            { title_en: { _ilike: $query } }
            { body_en:  { _ilike: $query } }
          ]
        }
        limit: 3
        order_by: { imported_at: desc }
      ) {
        id
        title_en
        body_en
        category
        source_url
        madhab_tags
      }
    }
  `

  // Build a loose ILIKE pattern from query keywords (top 5 words, ≥4 chars)
  const keywords  = query.split(/\s+/).filter((w) => w.length >= 4).slice(0, 5)
  const pattern   = keywords.length > 0 ? `%${keywords.join('%')}%` : `%${query.slice(0, 50)}%`

  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body:   JSON.stringify({ query: GQL, variables: { query: pattern } }),
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) return []

    const data = await res.json() as {
      data?: {
        ci_islamqa_questions?: Array<{
          id:          string
          title_en:    string
          body_en:     string | null
          category:    string | null
          source_url:  string | null
          madhab_tags: string[] | null
        }>
      }
    }

    return (data.data?.ci_islamqa_questions ?? []).map((q) => ({
      questionId: q.id,
      titleEn:    q.title_en,
      bodyEn:     q.body_en,
      category:   q.category,
      sourceUrl:  q.source_url,
      madhabTags: q.madhab_tags ?? [],
    }))
  } catch {
    // Non-blocking — IslamQA corpus is supplementary
    return []
  }
}
