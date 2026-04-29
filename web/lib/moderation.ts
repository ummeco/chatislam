/**
 * ChatIslam — Moderation + Injection Detection (SCI-09)
 *
 * Provides:
 *   - detectInjectionAttempt()  — pattern-based jailbreak detection
 *   - logModerationEvent()      — persists events to ci_moderation_events via Hasura
 *
 * Events are logged by sha256 hash of the message only — no plaintext stored.
 */

import * as Sentry from '@sentry/nextjs'
import crypto from 'crypto'

// ─── Types ─────────────────────────────────────────────────────────────────

export type ModerationEventType =
  | 'injection_attempt'
  | 'aqeedah_hard_block'
  | 'aqeedah_soft_flag'
  | 'escalation_token_stripped'
  | 'pii_redacted'
  | 'moderation_flag'

export interface InjectionDetectionResult {
  detected: boolean
  patternMatched: string | null
}

// ─── Jailbreak detection patterns (T0-04-02: extended with OWASP LLM Top 10) ──

const JAILBREAK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Classic instruction-override attacks (OWASP LLM01)
  { pattern: /ignore\s+(all\s+)?previous\s+instructions?/i,          label: 'ignore_previous_instructions' },
  { pattern: /disregard\s+(your\s+)?system\s+prompt/i,               label: 'disregard_system_prompt' },
  { pattern: /forget\s+(your\s+)?instructions?/i,                     label: 'forget_instructions' },
  { pattern: /new\s+instructions?\s*:/i,                              label: 'new_instructions' },
  { pattern: /override\s+(your\s+)?(system\s+)?(instructions?|prompt|rules?)/i, label: 'override_instructions' },
  // Role / context injection via delimiter (OWASP LLM01)
  { pattern: /\n\s*(system|assistant|human)\s*:/i,                    label: 'role_injection' },
  { pattern: /<\s*system\s*>/i,                                       label: 'xml_system_tag' },
  { pattern: /###\s*(system|instruction|prompt|override)/i,           label: 'hash_delimiter_injection' },
  { pattern: /<\|(?:im_start|im_end|system|endoftext)\|>/i,          label: 'special_token_injection' },
  { pattern: /\[INST\]/i,                                             label: 'llama_instruction_tag' },
  // Persona / restriction bypass (OWASP LLM01)
  { pattern: /DAN\s+(mode|jailbreak|prompt)/i,                        label: 'dan_jailbreak' },
  { pattern: /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(AI|model|assistant)\s+without/i, label: 'pretend_no_restrictions' },
  { pattern: /you\s+(are\s+now|have\s+no|must\s+ignore)\s+(your\s+)?(restrictions?|guidelines?|rules?)/i, label: 'restriction_bypass' },
  { pattern: /developer\s+mode/i,                                     label: 'developer_mode' },
  { pattern: /jailbreak/i,                                            label: 'explicit_jailbreak' },
  // Prompt leak attacks — asking to reveal the system prompt (OWASP LLM01 / LLM07)
  { pattern: /what\s+(is|are)\s+your\s+system\s+prompt/i,            label: 'system_prompt_leak' },
  { pattern: /repeat\s+(the\s+)?(prompt|instructions?)\s+above/i,    label: 'repeat_prompt_above' },
  { pattern: /print\s+(out\s+)?(your\s+)?(system\s+)?(prompt|instructions?)/i, label: 'print_prompt' },
  { pattern: /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions?)/i,   label: 'show_prompt' },
  { pattern: /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,          label: 'reveal_prompt' },
  { pattern: /output\s+(your\s+)?(initial|original|system)\s+(prompt|instructions?)/i, label: 'output_prompt' },
  // Indirect / virtualization attacks (OWASP LLM01)
  { pattern: /imagine\s+(you\s+have\s+no|you\s+are\s+free\s+from|there\s+are\s+no)\s+(restrictions?|guidelines?|rules?)/i, label: 'virtualization_attack' },
  { pattern: /act\s+as\s+if\s+(you\s+have\s+no|there\s+are\s+no)\s+(restrictions?|guidelines?|rules?)/i,                  label: 'act_as_unrestricted' },
  { pattern: /hypothetically[,\s]+if\s+you\s+(had\s+no|were\s+free\s+from)\s+(restrictions?|guidelines?)/i,               label: 'hypothetical_bypass' },
  // Token-splitting / encoding tricks (OWASP LLM01)
  { pattern: /base64[:\s]+/i,                                         label: 'base64_encoding_attempt' },
  { pattern: /translate\s+(the\s+following|this)\s+(to|into)\s+(english|arabic|code)/i, label: 'translate_extraction' },
]

/**
 * Detect prompt injection / jailbreak attempts in raw user input.
 *
 * @param rawInput  The original user message (unsanitized)
 * @returns         Result with detected flag and first matched pattern label
 */
export function detectInjectionAttempt(rawInput: string): InjectionDetectionResult {
  for (const { pattern, label } of JAILBREAK_PATTERNS) {
    if (pattern.test(rawInput)) {
      return { detected: true, patternMatched: label }
    }
  }
  return { detected: false, patternMatched: null }
}

/**
 * SHA-256 hash of a message for moderation logging.
 * Never stores plaintext — only the hash.
 */
export function hashMessage(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// ─── Hasura persistence ─────────────────────────────────────────────────────

const HASURA_ENDPOINT    = process.env.HASURA_ENDPOINT ?? 'https://api.ummat.dev/v1/graphql'
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET ?? ''

const INSERT_MODERATION_EVENT = `
  mutation InsertModerationEvent($object: ci_moderation_events_insert_input!) {
    insert_ci_moderation_events_one(object: $object) { id }
  }
`

export interface ModerationEventInput {
  sessionId:      string | null
  eventType:      ModerationEventType
  patternMatched: string | null
  messageHash:    string
}

/**
 * Log a moderation event to ci_moderation_events.
 * Non-blocking — failures are logged but do not throw.
 */
export async function logModerationEvent(input: ModerationEventInput): Promise<void> {
  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: INSERT_MODERATION_EVENT,
        variables: {
          object: {
            session_id:      input.sessionId,
            event_type:      input.eventType,
            pattern_matched: input.patternMatched,
            message_hash:    input.messageHash,
          },
        },
      }),
    })

    if (!res.ok) {
      Sentry.captureException(new Error(`[moderation] Failed to log event: ${res.status}`))
      console.error('[moderation] Failed to log event', { status: res.status, eventType: input.eventType })
    }
  } catch (err) {
    Sentry.captureException(err)
    console.error('[moderation] Hasura error logging event', { error: String(err) })
  }
}
