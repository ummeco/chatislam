/**
 * ChatIslam — Anon → Auth Session Upgrade (CB-07 T46)
 *
 * Merges an anonymous session into an authenticated user's session upon sign-in.
 *
 * Flow:
 *   1. User chats anonymously — messages stored with session_id in localStorage
 *   2. User signs in or creates account
 *   3. upgradeSession() is called with the anon session_id + the new JWT
 *   4. All ci_messages for the anon session are reassigned to the authed user
 *   5. The ci_sessions row is updated with the user_id
 *   6. localStorage anon session_id is cleared
 *
 * This is a server action or called from a route handler — never browser-accessible directly.
 * Falls back gracefully: if the anon session has no messages, it is simply abandoned.
 */

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

export interface UpgradeResult {
  upgraded:         boolean
  messages_moved:   number
  anon_session_id:  string
  user_session_id?: string
}

/**
 * Upgrade an anonymous session to an authenticated user session.
 *
 * @param anonSessionId - The session_id from localStorage (anonymous)
 * @param userId        - The authenticated user's ID from the JWT claims
 * @returns             - UpgradeResult with upgrade status
 */
export async function upgradeSession(
  anonSessionId: string,
  userId:        string,
): Promise<UpgradeResult> {
  if (!HASURA_ENDPOINT || !anonSessionId || !userId) {
    return { upgraded: false, messages_moved: 0, anon_session_id: anonSessionId }
  }

  try {
    // 1. Fetch the anon session and its messages
    const sessionData = await hasuraQuery<{
      ci_sessions: Array<{
        id:       string
        user_id:  string | null
        messages: Array<{ id: string }>
      }>
    }>(
      `query($session_id: uuid!) {
        ci_sessions(
          where: { id: { _eq: $session_id }, user_id: { _is_null: true } }
          limit: 1
        ) {
          id user_id
          messages: ci_messages { id }
        }
      }`,
      { session_id: anonSessionId },
    )

    const anonSession = sessionData.ci_sessions[0]
    if (!anonSession) {
      // Anon session doesn't exist — nothing to upgrade
      return { upgraded: false, messages_moved: 0, anon_session_id: anonSessionId }
    }

    // T03 (SEC-HARDENING): Reject if session is already owned by ANY user.
    // The query already fetches user_id; if non-null, this session was previously
    // claimed — reject to prevent session hijack via a known anon UUID.
    if (anonSession.user_id !== null) {
      return { upgraded: false, messages_moved: 0, anon_session_id: anonSessionId }
    }

    const messageCount = anonSession.messages.length
    if (messageCount === 0) {
      // Nothing to upgrade — abandon the empty anon session
      return { upgraded: false, messages_moved: 0, anon_session_id: anonSessionId }
    }

    // 2. Check if the user already has an existing authenticated session.
    //    Messages will be moved there; otherwise a fresh session UUID is created.
    const userSessionData = await hasuraQuery<{
      ci_sessions: Array<{ id: string }>
    }>(
      `query($user_id: uuid!) {
        ci_sessions(
          where:    { user_id: { _eq: $user_id } }
          order_by: { last_message_at: desc_nulls_last }
          limit:    1
        ) { id }
      }`,
      { user_id: userId },
    )

    // T03 (SEC-HARDENING): Issue a NEW session UUID for the authenticated user.
    // Never claim the anon session row — textbook session fixation fix.
    // The new session is created fresh; the anon session is then abandoned.
    const existingUserSessionId = userSessionData.ci_sessions[0]?.id ?? null

    // 3a. If user already has a session, target that; else create a new one.
    let targetSessionId: string
    if (existingUserSessionId) {
      targetSessionId = existingUserSessionId
    } else {
      // Insert a new authenticated session row with a fresh UUID
      const newSession = await hasuraQuery<{
        insert_ci_sessions_one: { id: string }
      }>(
        `mutation($user_id: uuid!) {
          insert_ci_sessions_one(object: { user_id: $user_id }) { id }
        }`,
        { user_id: userId },
      )
      targetSessionId = newSession.insert_ci_sessions_one.id
    }

    // 3b. Move messages from the anon session to the new/existing authenticated session
    await hasuraQuery(
      `mutation($anon_id: uuid!, $target_id: uuid!) {
        update_ci_messages(
          where: { session_id: { _eq: $anon_id } }
          _set:  { session_id: $target_id }
        ) { affected_rows }
      }`,
      { anon_id: anonSessionId, target_id: targetSessionId },
    )

    // 3c. Mark the anon session abandoned (not deleted — preserves audit trail)
    await hasuraQuery(
      `mutation($id: uuid!) {
        update_ci_sessions_by_pk(
          pk_columns: { id: $id }
          _set:       { abandoned: true }
        ) { id }
      }`,
      { id: anonSessionId },
    )

    // The caller MUST update localStorage to the new targetSessionId.
    return {
      upgraded:        true,
      messages_moved:  messageCount,
      anon_session_id: anonSessionId,
      user_session_id: targetSessionId,
    }

  } catch (err) {
    console.error('[session-upgrade] error', err)
    // Non-critical: return gracefully
    return { upgraded: false, messages_moved: 0, anon_session_id: anonSessionId }
  }
}
