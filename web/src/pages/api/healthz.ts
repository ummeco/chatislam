/**
 * src/pages/api/healthz.ts — Astro SSR API endpoint for health check (k8s-style).
 *
 * PURPOSE: Liveness probe — returns service status, version, and timestamp.
 * OUTPUTS: { status, version, timestamp }
 */

import type { APIRoute } from 'astro'

export const prerender = false

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'unknown'

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
