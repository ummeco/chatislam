'use client'

/**
 * ChatIslam — Disclaimer Footer (SCI-12)
 *
 * Persistent disclaimer rendered below the chat input (once per session view)
 * and in the widget (SCI-16).
 *
 * "This is AI-generated content, not a fatwa."
 * WCAG AA compliant. No JS required for the static text — JS-rendered version
 * for chat context only.
 */

interface DisclaimerFooterProps {
  /** If true, render minimal one-line version for widget embed */
  compact?: boolean
}

const DISCLAIMER_TEXT =
  'AI-generated for informational purposes only. Not a fatwa or religious ruling. ' +
  'Consult a qualified Islamic scholar for personal guidance.'

const DISCLAIMER_COMPACT =
  'AI response only — not a fatwa. Consult a scholar.'

export default function DisclaimerFooter({ compact = false }: DisclaimerFooterProps) {
  return (
    <p
      role="note"
      aria-label="Disclaimer: AI-generated content, not a fatwa"
      className={[
        'text-[rgba(201,242,122,0.5)] leading-snug text-center',
        compact ? 'text-[0.7rem] mt-1' : 'text-xs mt-2',
      ].join(' ')}
    >
      {compact ? DISCLAIMER_COMPACT : DISCLAIMER_TEXT}
    </p>
  )
}

export { DISCLAIMER_TEXT, DISCLAIMER_COMPACT }
