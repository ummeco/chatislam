/**
 * ChatIslam — /dawah page (CB-04 T30)
 *
 * Dawah-focused landing page for non-Muslim visitors.
 * Shows DawahModeHero + routes to the chat with NonMuslim audience mode pre-set.
 * Feature flag: FF_DAWAH_MODE
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DawahPageClient } from './DawahPageClient'

export const metadata: Metadata = {
  title:       'Explore Islam | ChatIslam',
  description: 'Ask honest questions about Islam. Clear, respectful answers — no pressure, no judgment.',
  openGraph: {
    title:       'Explore Islam | ChatIslam',
    description: 'A safe space to ask anything about Islam.',
    type:        'website',
  },
}

export default function DawahPage() {
  if (process.env.FF_DAWAH_MODE === 'false') {
    redirect('/chat')
  }
  return <DawahPageClient />
}
