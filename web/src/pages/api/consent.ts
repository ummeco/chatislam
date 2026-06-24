/**
 * S-C-S05-T05b — /api/consent for ChatIslam (chatislam.org).
 *
 * Delegates to the shared handler in @ummat/consent. Records ALL consent
 * grants/withdrawals into lg_consent_record (insert-only, GDPR Art 7).
 *
 * Astro SSR port of the former Next.js App-Router route (structural only —
 * business logic unchanged).
 */

import type { APIRoute } from 'astro'
import { z } from 'zod'
import { handleConsentRequest, type ConsentHandlerInput } from '@ummat/consent/server'

export const prerender = false

const ConsentPostSchema = z.object({
  consentType: z.string().min(1),
  granted:     z.boolean(),
}).passthrough()

const DOMAIN = 'chatislam.org'

const HASURA_ENDPOINT =
  process.env.HASURA_ADMIN_URL ??
  process.env.NEXT_PUBLIC_HASURA_URL ??
  'https://api.ummat.dev/v1/graphql'
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''

function userIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice(7)
    const payload = token.split('.')[1]
    if (!payload) return null
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8')) as {
      sub?: string
      'https://hasura.io/jwt/claims'?: { 'x-hasura-user-id'?: string }
    }
    const hasuraUid = decoded['https://hasura.io/jwt/claims']?.['x-hasura-user-id']
    return hasuraUid ?? decoded.sub ?? null
  } catch {
    return null
  }
}

async function buildInput(
  request: Request,
  method: ConsentHandlerInput['method']
): Promise<ConsentHandlerInput> {
  const userId = userIdFromJwt(request.headers.get('authorization'))
  const countryCode = request.headers.get('cf-ipcountry') ?? null
  let body: unknown = undefined
  if (method === 'POST') {
    const rawBody = await request.json().catch(() => null)
    const parsed = ConsentPostSchema.safeParse(rawBody)
    body = parsed.success ? parsed.data : rawBody  // pass to shared handler for further validation
  }
  return {
    method,
    headers: request.headers,
    body,
    userId,
    countryCode,
    domain: DOMAIN,
    hasura: { endpoint: HASURA_ENDPOINT, adminSecret: HASURA_ADMIN_SECRET },
  }
}

async function dispatch(request: Request, method: ConsentHandlerInput['method']): Promise<Response> {
  if (!HASURA_ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: 'misconfigured: HASURA_GRAPHQL_ADMIN_SECRET missing', code: 'CONFIG' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const input = await buildInput(request, method)
  const result = await handleConsentRequest(input)
  return new Response(JSON.stringify(result.body), {
    status:  result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request }) => dispatch(request, 'POST')
export const GET: APIRoute = async ({ request }) => dispatch(request, 'GET')
export const DELETE: APIRoute = async ({ request }) => dispatch(request, 'DELETE')
