/**
 * src/pages/api/health.ts — Astro SSR API endpoint for health check.
 *
 * PURPOSE: Liveness probe — returns service status, version, and timestamp.
 * OUTPUTS: { status, timestamp, version }
 */

import type { APIRoute } from 'astro'

export const prerender = false

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
