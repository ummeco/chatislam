/**
 * ChatIslam — Hasura Remote Schema endpoint
 *
 * Hasura calls this route to resolve ChatIslam-specific GraphQL fields (AI chat
 * sessions, query history, dawah mode settings) federated into api.ummat.dev.
 * Every Hasura request includes x-remote-schema-secret for authentication.
 *
 * Phase 1 (stub): returns an empty schema stub.
 * Implement chat session queries and mutations in CI v0.2+.
 *
 * See: backend/docs/architecture.md — Hasura Remote Schemas
 */

import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.REMOTE_SCHEMA_SECRET

const INTROSPECTION_RESPONSE = {
  data: {
    __schema: {
      queryType: { name: 'Query' },
      mutationType: null,
      subscriptionType: null,
      types: [
        {
          kind: 'OBJECT',
          name: 'Query',
          description: 'ChatIslam Remote Schema',
          fields: [
            {
              name: '_chatislam',
              description: 'Placeholder — expanded in CI v0.2',
              args: [],
              type: { kind: 'SCALAR', name: 'Boolean', ofType: null },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
      ],
      directives: [],
    },
  },
}

function unauthorized() {
  return NextResponse.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 })
}

export async function POST(req: NextRequest) {
  if (!SECRET || req.headers.get('x-remote-schema-secret') !== SECRET) {
    return unauthorized()
  }

  const body = await req.json()

  if (
    typeof body.query === 'string' &&
    (body.query.includes('__schema') || body.query.includes('IntrospectionQuery'))
  ) {
    return NextResponse.json(INTROSPECTION_RESPONSE)
  }

  return NextResponse.json({ data: { _chatislam: null } })
}

// Only Hasura (api.ummat.dev) and local dev call this Remote Schema endpoint.
// Wildcard is replaced with an explicit allowlist — never open to all origins.
const REMOTE_SCHEMA_ORIGINS = [
  'https://api.ummat.dev',
  'https://api.chatislam.local.nself.org:8543',
]

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('Origin') ?? ''
  const corsOrigin = REMOTE_SCHEMA_ORIGINS.includes(origin) ? origin : null

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin } : {}),
      'Access-Control-Allow-Headers': 'Content-Type, x-remote-schema-secret',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  })
}
