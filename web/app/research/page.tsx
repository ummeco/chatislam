/**
 * ChatIslam — /research page (CB-01 T08)
 *
 * Feynman Research Agent interface.
 * Depth selector → research input → progress bar → result.
 */

import type { Metadata } from 'next'
import { ResearchPageClient } from './ResearchPageClient'

export const metadata: Metadata = {
  title:       'Research | ChatIslam',
  description: 'Deep Islamic research powered by the Feynman Research Agent. Summary, cited, or scholarly depth.',
}

export default function ResearchPage() {
  return <ResearchPageClient />
}
