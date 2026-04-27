/**
 * ChatIslam — Rate Limiter: Adapter Interface + Factory
 *
 * Adapter design: swap between in-memory (Phase 1) and Redis-backed (Phase 3+)
 * without touching call sites. Redis activates automatically when REDIS_URL is set.
 *
 * Limits (per spec):
 *   Anonymous (IP):  5 req/min
 *   Authenticated:  30 req/min
 *   API token:     100 req/min
 *
 * Algorithm: sliding window (fixed window for memory adapter, true sliding for Redis).
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

/** Adapter interface — memory and Redis adapters both implement this. */
export interface RateLimitAdapter {
  check(key: string, opts: RateLimitOptions): Promise<RateLimitResult>
}

// ---------------------------------------------------------------------------
// Factory — picks adapter based on environment
// ---------------------------------------------------------------------------

// Memory adapter only — safe for Edge runtime (no Node.js modules).
// For Node.js server routes that need Redis, use lib/rate-limit-server.ts instead.
import { MemoryRateLimitAdapter } from './rate-limit-memory'

const _memoryAdapter = new MemoryRateLimitAdapter()

export function getRateLimitAdapter(): RateLimitAdapter {
  return _memoryAdapter
}

/** Reset the cached adapter (used in tests — no-op since memory adapter is a singleton). */
export function resetAdapterCache(): void {
  _memoryAdapter._clear()
}

// ---------------------------------------------------------------------------
// Convenience wrapper — used by middleware and route handlers
// ---------------------------------------------------------------------------

export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  return getRateLimitAdapter().check(key, opts)
}

// ---------------------------------------------------------------------------
// Standard limit configs (per spec)
// ---------------------------------------------------------------------------

/** Anonymous (IP-only): 5 req/min */
export const ANON_PER_MINUTE: RateLimitOptions = { limit: 5, windowMs: 60_000 }

/** Authenticated user: 30 req/min */
export const AUTH_PER_MINUTE: RateLimitOptions = { limit: 30, windowMs: 60_000 }

/** API token: 100 req/min */
export const TOKEN_PER_MINUTE: RateLimitOptions = { limit: 100, windowMs: 60_000 }

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function getClientIp(req: Request): string {
  // Vercel forwards real IP in x-forwarded-for; fall back to a safe sentinel
  const xff = (req as { headers?: { get?: (k: string) => string | null } }).headers?.get?.('x-forwarded-for') ?? ''
  return xff.split(',')[0].trim() || 'unknown'
}
