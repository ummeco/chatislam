/**
 * ChatIslam — Aqeedah Guardrails (SCI-13)
 *
 * Detects queries that probe deviant sects or boundary aqeedah topics.
 * Two response levels:
 *   hard_block  — Ahmadiyya, Nation of Islam: redirect to own tradition, no engagement
 *   soft_flag   — Shia queries: Sunni position presented only, no endorsement
 *
 * All boundary probe events are logged via logModerationEvent().
 */

import { logModerationEvent, hashMessage, type ModerationEventType } from './moderation'

// ─── Types ─────────────────────────────────────────────────────────────────

export type AqeedahGuardResult =
  | { action: 'allow' }
  | { action: 'hard_block'; message: string; sect: string }
  | { action: 'soft_flag';  sect: string }

// ─── Pattern sets ────────────────────────────────────────────────────────────

/**
 * Hard block — Ahmadiyya (Qadiani), Nation of Islam.
 * These sects are outside Islam per scholarly consensus.
 * We do not engage; we redirect them to their own scholars.
 */
const HARD_BLOCK_PATTERNS: Array<{ pattern: RegExp; sect: string }> = [
  {
    pattern: /\b(ahmadi(yya)?|qadiani|mirza\s+ghulam\s+ahmad|rabwa|rabwah)\b/i,
    sect: 'ahmadiyya',
  },
  {
    pattern: /\b(nation\s+of\s+islam|NOI\b|elijah\s+muhammad|louis\s+farrakhan|w\.d\.?\s*fard)\b/i,
    sect: 'nation_of_islam',
  },
]

/**
 * Soft flag — Shia queries.
 * Present Sunni scholarly position only; do not endorse Shia positions.
 * No hard block — many questions are legitimate comparative inquiry.
 */
const SOFT_FLAG_PATTERNS: Array<{ pattern: RegExp; sect: string }> = [
  {
    pattern: /\b(shia|shi'a|shi'ite|shiite|twelver|imami|ismaili|ithna\s+ashari|ja'fari|jafari)\b/i,
    sect: 'shia',
  },
  {
    pattern: /\b(mut'?a\s+marriage|temporary\s+marriage)\b/i,
    sect: 'shia',
  },
  {
    pattern: /\bmatn?am\b.*\bhusayn?\b|\bkarbala\b.*\b(mourning|azaa|matam)\b/i,
    sect: 'shia',
  },
]

// ─── Hard block response text ─────────────────────────────────────────────

const HARD_BLOCK_MESSAGE =
  'This platform follows mainstream Sunni Islamic scholarship. ' +
  'For questions related to your tradition, please consult scholars within your community. ' +
  'JazakAllahu Khairan.'

// ─── Guard function ──────────────────────────────────────────────────────────

/**
 * Evaluate a user message for aqeedah boundary probes.
 * Logs to ci_moderation_events on any non-allow result.
 */
export async function detectAqeedahBoundaryProbe(
  message: string,
  sessionId: string | null,
): Promise<AqeedahGuardResult> {
  // Check hard block patterns first
  for (const { pattern, sect } of HARD_BLOCK_PATTERNS) {
    if (pattern.test(message)) {
      // Log event (fire-and-forget)
      void logModerationEvent({
        sessionId,
        eventType:      'aqeedah_hard_block' as ModerationEventType,
        patternMatched: sect,
        messageHash:    hashMessage(message),
      })

      return { action: 'hard_block', message: HARD_BLOCK_MESSAGE, sect }
    }
  }

  // Check soft flag patterns
  for (const { pattern, sect } of SOFT_FLAG_PATTERNS) {
    if (pattern.test(message)) {
      // Log event (fire-and-forget)
      void logModerationEvent({
        sessionId,
        eventType:      'aqeedah_soft_flag' as ModerationEventType,
        patternMatched: sect,
        messageHash:    hashMessage(message),
      })

      return { action: 'soft_flag', sect }
    }
  }

  return { action: 'allow' }
}

/**
 * System prompt addendum for soft_flag responses.
 * Prepended to the existing guardrails when a Shia-adjacent topic is detected.
 */
export const SHIA_SOFT_FLAG_ADDENDUM =
  'IMPORTANT: The user has asked about a topic where Shia and Sunni positions differ. ' +
  'Present only the mainstream Sunni scholarly position based on the four major madhabs. ' +
  'Do not validate, endorse, or present Shia jurisprudence or theology as a valid Islamic position. ' +
  'You may acknowledge that differences exist among Muslims without engaging with Shia positions.'
