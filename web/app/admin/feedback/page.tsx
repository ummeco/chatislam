/**
 * ChatIslam — Admin Feedback Review Queue (T04-P9, stub level)
 *
 * Lists unreviewed ci_message_feedback rows (reviewed_at IS NULL).
 * Auth: admin JWT required (x-hasura-role: admin).
 * Full admin UI (inline edit, bulk actions, filters) is P10 scope.
 *
 * This stub satisfies the privacy policy requirement: feedback data is
 * collected AND reviewable. The data exists — this page exposes it.
 */

import { redirect } from 'next/navigation'
import { cookies }  from 'next/headers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackRow {
  id:               string
  message_id:       string
  session_id:       string
  user_id:          string | null
  rating:           number
  correction_text:  string | null
  flagged_reason:   string | null
  created_at:       string
}

// ─── Hasura query ─────────────────────────────────────────────────────────────

const QUERY_UNREVIEWED = `
  query AdminFeedbackQueue($limit: Int!, $offset: Int!) {
    ci_message_feedback(
      where:    { reviewed_at: { _is_null: true } }
      order_by: { created_at: desc }
      limit:    $limit
      offset:   $offset
    ) {
      id
      message_id
      session_id
      user_id
      rating
      correction_text
      flagged_reason
      created_at
    }
    ci_message_feedback_aggregate(where: { reviewed_at: { _is_null: true } }) {
      aggregate { count }
    }
  }
`

async function fetchUnreviewed(
  page: number,
): Promise<{ rows: FeedbackRow[]; total: number } | null> {
  const endpoint = process.env.HASURA_ADMIN_URL ?? process.env.NEXT_PUBLIC_HASURA_URL ?? ''
  const secret   = process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? ''
  if (!endpoint) return null

  const limit  = 50
  const offset = (page - 1) * limit

  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': secret,
      },
      body:   JSON.stringify({ query: QUERY_UNREVIEWED, variables: { limit, offset } }),
      signal: AbortSignal.timeout(5000),
      cache:  'no-store',
    })
    if (!res.ok) return null
    const data = await res.json() as {
      data?: {
        ci_message_feedback?: FeedbackRow[]
        ci_message_feedback_aggregate?: { aggregate?: { count?: number } }
      }
    }
    return {
      rows:  data.data?.ci_message_feedback ?? [],
      total: data.data?.ci_message_feedback_aggregate?.aggregate?.count ?? 0,
    }
  } catch {
    return null
  }
}

// ─── Admin auth check (server-side) ───────────────────────────────────────────

function extractRoleFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'),
    )
    // Hasura claims path
    const claims = (decoded as Record<string, unknown>)['https://hasura.io/jwt/claims'] as
      Record<string, unknown> | undefined
    return (claims?.['x-hasura-default-role'] as string) ?? null
  } catch {
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminFeedbackPage({ searchParams }: Props) {
  // Auth check — require admin role from session cookie
  const cookieStore = await cookies()
  const authToken   = cookieStore.get('hasura-auth-token')?.value ?? ''
  const role        = extractRoleFromJwt(authToken)

  if (!authToken || role !== 'admin') {
    redirect('/auth/signin?redirect=/admin/feedback')
  }

  const { page: pageStr } = await searchParams
  const page              = Math.max(1, parseInt(pageStr ?? '1', 10))
  const result            = await fetchUnreviewed(page)

  if (!result) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-white">Feedback Review Queue</h1>
        <p className="mt-4 text-red-400">Could not load feedback data. Check Hasura connection.</p>
      </main>
    )
  }

  const { rows, total } = result
  const totalPages      = Math.ceil(total / 50)

  return (
    <main className="p-8">
      <h1 className="mb-2 text-xl font-bold text-white">Feedback Review Queue</h1>
      <p className="mb-6 text-sm text-gray-400">
        {total} unreviewed item{total !== 1 ? 's' : ''}
      </p>

      {rows.length === 0 ? (
        <p className="text-emerald-400">All feedback has been reviewed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                <th className="pb-2 pr-4">Rating</th>
                <th className="pb-2 pr-4">Reason</th>
                <th className="pb-2 pr-4">Correction</th>
                <th className="pb-2 pr-4">Message ID</th>
                <th className="pb-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-800 align-top"
                >
                  <td className="py-2 pr-4">
                    <span className={row.rating === 1 ? 'text-emerald-400' : 'text-red-400'}>
                      {row.rating === 1 ? '👍' : '👎'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {row.flagged_reason ?? '—'}
                  </td>
                  <td className="max-w-sm py-2 pr-4">
                    {row.correction_text
                      ? <span className="line-clamp-3">{row.correction_text}</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                    {row.message_id.slice(0, 8)}…
                  </td>
                  <td className="py-2 text-xs text-gray-500">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex gap-2" aria-label="Pagination">
          {page > 1 && (
            <a
              href={`/admin/feedback?page=${page - 1}`}
              className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:border-gray-500"
            >
              Prev
            </a>
          )}
          <span className="px-3 py-1 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/feedback?page=${page + 1}`}
              className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:border-gray-500"
            >
              Next
            </a>
          )}
        </nav>
      )}

      <p className="mt-8 text-xs text-gray-600">
        Full admin UI (mark reviewed, bulk actions, filters) is P10 scope.
        Data is collected per privacy policy and reviewable here.
      </p>
    </main>
  )
}
