/**
 * ChatIslam — /tutor/[pathId] page (CB-03 T25)
 *
 * Tutor session page: loads session for the given pathId, renders TutorLessonView.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TutorSessionClient } from './TutorSessionClient'

interface Props {
  params: Promise<{ pathId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pathId } = await params
  return {
    title:       `Tutor Session | ChatIslam`,
    description: `AI-guided Islamic learning for path ${pathId}.`,
  }
}

export default async function TutorSessionPage({ params }: Props) {
  if (process.env.FF_AI_TUTOR === 'false') {
    redirect('/chat')
  }
  const { pathId } = await params
  return <TutorSessionClient pathId={pathId} />
}
