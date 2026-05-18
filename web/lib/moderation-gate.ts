/**
 * @file chatislam/web/lib/moderation-gate.ts
 * @purpose AI response moderation gate for ChatIslam.
 *          After each Claude response, asynchronously:
 *          1. Hashes the question + response (SHA-256, PII protection).
 *          2. Calls the moderation check endpoint on the Ummat backend.
 *          3. If flagged, creates a ci_response_audit row and enqueues for scholar review.
 *
 *          This gate is NON-BLOCKING — it never delays the user response.
 *          Audit + escalation happen after the response is already streamed.
 * @owner chatislam / compliance
 * @invariants
 *   - Gate must NOT affect response latency for the user.
 *   - Question and response content are NEVER stored — only SHA-256 hashes.
 *   - Arabic text (RTL) is passed to hash function as-is — no string manipulation.
 * @do-not
 *   - DO NOT await this gate in the chat API route's response path.
 *   - DO NOT log question or response content (PII/content risk).
 */

import { createHash } from 'crypto'

export interface ModerationGateInput {
  sessionId: string
  userId: string | null
  question: string
  response: string
}

export interface ModerationGateResult {
  flagged: boolean
  reason?: string
  auditId?: string
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Run the moderation gate asynchronously. Call this AFTER the response has been
 * sent to the user — never await in the response path.
 *
 * Usage (in API route):
 *   void runModerationGate({ sessionId, userId, question, response }).catch(() => {})
 */
export async function runModerationGate(input: ModerationGateInput): Promise<ModerationGateResult> {
  const { sessionId, userId, question, response } = input

  const questionHash = sha256Hex(question)
  const responseHash = sha256Hex(response)

  const handlerUrl = process.env.CONTMOD_HANDLER_URL ?? 'http://localhost:3047/api/moderation'

  try {
    const res = await fetch(`${handlerUrl}/chatislam/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-remote-schema-secret': process.env.REMOTE_SCHEMA_SECRET ?? '',
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        question_hash: questionHash,
        response_hash: responseHash,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { flagged: false }
    }

    const data = (await res.json()) as { flagged: boolean; reason?: string; audit_id?: string }
    return {
      flagged: data.flagged ?? false,
      reason: data.reason,
      auditId: data.audit_id,
    }
  } catch {
    // Non-blocking: gate failure never affects the user
    return { flagged: false }
  }
}
