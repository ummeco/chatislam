/**
 * ChatIslam — /tutor page (CB-03 T25)
 *
 * AI Tutor landing: shows available paths and user progress.
 * Feature-flagged: redirects to /chat if FF_AI_TUTOR is off.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TutorPageClient } from './TutorPageClient'

export const metadata: Metadata = {
  title:       'AI Tutor | ChatIslam',
  description: 'Structured Islamic learning paths with AI-powered tutoring and mastery tracking.',
}

export default function TutorPage() {
  if (process.env.FF_AI_TUTOR === 'false') {
    redirect('/chat')
  }
  return <TutorPageClient />
}
