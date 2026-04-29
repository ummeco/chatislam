/**
 * ChatIslam — Input Sanitization (SCI-08, T0-04-02)
 *
 * Strips escalation tokens ([ESCALATE_SONNET], [ESCALATE_HUMAN]) from API payloads
 * before they reach the AI. The display copy in the UI is never mutated here —
 * sanitization applies only to the text sent to the Anthropic API.
 *
 * T0-04-02 additions:
 *   - MAX_USER_INPUT_LENGTH: hard cap at 8000 chars (truncated with notice)
 *   - stripControlChars(): removes null bytes, C0/C1 control chars, BOM, zero-width chars
 *     that can be used to smuggle hidden instructions or confuse tokenizers
 *   - Enhanced INJECTION_STRIP_PATTERNS: added LLM-instruction delimiters
 *
 * Pure function — no side-effects, fully unit-testable.
 */

// ─── Length cap ────────────────────────────────────────────────────────────────

/**
 * Maximum allowed input length sent to the AI model.
 * Inputs exceeding this are hard-truncated. 8000 chars is ~2000 tokens,
 * well within Sonnet context but limits adversarial prompt-stuffing.
 */
export const MAX_USER_INPUT_LENGTH = 8_000

/**
 * Suffix appended when input is truncated so the model knows it received
 * a truncated message rather than an oddly incomplete one.
 */
const TRUNCATION_NOTICE = ' [message truncated]'

// ─── Escalation tokens ─────────────────────────────────────────────────────────

/**
 * Escalation tokens that must never reach the AI model.
 * These are internal routing signals; sending them raw to Claude would
 * pollute context and could be abused as injection vectors.
 */
const ESCALATION_TOKEN_PATTERNS: RegExp[] = [
  /\[ESCALATE_SONNET\]/gi,
  /\[ESCALATE_HUMAN\]/gi,
]

// ─── Injection-style strip patterns ───────────────────────────────────────────

/**
 * Patterns stripped from the AI-bound payload.
 * Display copy is preserved — only the AI-bound string is sanitized.
 *
 * T0-04-02: added ###, <|, [INST] / [/INST] and /INST/ delimiters used
 * by open-weight LLMs and prompt-injection PoCs.
 */
const INJECTION_STRIP_PATTERNS: RegExp[] = [
  /^\s*(system|assistant|human)\s*:/gim,
  /<\s*system\s*>[\s\S]*?<\s*\/\s*system\s*>/gi,
  /\bignore\s+(all\s+)?previous\s+instructions?\b/gi,
  /\bdisregard\s+(your\s+)?system\s+prompt\b/gi,
  /\bforget\s+(your\s+)?instructions?\b/gi,
  /\bnew\s+instructions?\s*:/gi,
  // LLM instruction delimiters used in adversarial prompts
  /###\s*(system|instruction|prompt|override)/gi,
  /<\|(?:im_start|im_end|system|endoftext)\|>/gi,
  /\[INST\][\s\S]*?\[\/INST\]/gi,   // Llama-style instruction block
  /\[INST\]/gi,                      // Standalone open tag
  /\[\/INST\]/gi,                    // Standalone close tag
]

// ─── Control character stripping ──────────────────────────────────────────────

/**
 * Strip control characters and zero-width characters from input.
 *
 * These can be used to:
 *   - Smuggle hidden instructions invisible to human reviewers
 *   - Confuse tokenizers into misaligning role boundaries
 *   - Bypass regex pattern matching via interleaved invisible chars
 *
 * Keeps: printable ASCII, extended Latin, Arabic/Unicode script chars,
 *        standard whitespace (space, tab, newline, carriage return).
 * Strips: null bytes (0x00), C0 controls (0x01-0x08, 0x0B-0x0C, 0x0E-0x1F),
 *         C1 controls (0x7F-0x9F), BOM (0xFEFF), zero-width chars (0x200B-0x200D,
 *         0x2060, 0xFEFF), soft hyphen (0x00AD).
 */
export function stripControlChars(input: string): string {
  return input
    // Null bytes
    .replace(/\x00/g, '')
    // C0 control chars except \t (0x09), \n (0x0A), \r (0x0D)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // DEL and C1 controls
    .replace(/[\x7F-\x9F]/g, '')
    // Zero-width and invisible Unicode
    .replace(/[​-‍⁠﻿­]/g, '')
    // Unicode direction override chars (can reorder displayed text)
    .replace(/[‪-‮⁦-⁩]/g, '')
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Sanitize user input before passing to the AI API.
 *
 * Order of operations:
 *   1. Strip control characters (removes invisible smuggled content)
 *   2. Enforce length cap (hard truncate at 8000 chars)
 *   3. Strip escalation tokens
 *   4. Strip injection-style patterns
 *   5. Trim whitespace
 *
 * @param raw  The raw user message string
 * @returns    A sanitized copy safe to send to the model
 */
export function sanitizeUserInput(raw: string): string {
  // 1. Strip control chars
  let sanitized = stripControlChars(raw)

  // 2. Enforce length cap
  if (sanitized.length > MAX_USER_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_USER_INPUT_LENGTH) + TRUNCATION_NOTICE
  }

  // 3. Strip escalation tokens
  for (const pattern of ESCALATION_TOKEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  // 4. Strip injection-style patterns
  for (const pattern of INJECTION_STRIP_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  // 5. Trim
  return sanitized.trim()
}

/**
 * Check if the raw input contained any escalation tokens.
 * Used for logging purposes only — not a security gate.
 */
export function containsEscalationTokens(raw: string): boolean {
  return ESCALATION_TOKEN_PATTERNS.some((p) => p.test(raw))
}
