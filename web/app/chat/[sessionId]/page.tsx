/**
 * ChatIslam — /chat/[sessionId] — session restore page (CB-07 T45)
 *
 * Loads an existing session with message history for authenticated users.
 * Unauthenticated: redirects to /auth/signin.
 * Session not found: redirects to /chat.
 * Feature flag: FF_CONVERSATION_HISTORY
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SessionRestoreClient } from './SessionRestoreClient'

interface Props {
  params: Promise<{ sessionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params
  return {
    title:       'Conversation | ChatIslam',
    description: `Resume ChatIslam conversation ${sessionId}.`,
  }
}

export default async function ChatSessionPage({ params }: Props) {
  if (process.env.FF_CONVERSATION_HISTORY === 'false') {
    redirect('/chat')
  }
  const { sessionId } = await params
  return <SessionRestoreClient sessionId={sessionId} />
}
