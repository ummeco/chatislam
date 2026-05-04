/**
 * ChatIslam — Sign in page (CB-07 T42a)
 *
 * Hasura Auth sign-in form.
 * On success, stores JWT in localStorage as chatislam_token,
 * then redirects to ?next= param or /chat.
 */

import type { Metadata } from 'next'
import { SignInClient } from './SignInClient'

export const metadata: Metadata = {
  title:       'Sign In | ChatIslam',
  description: 'Sign in to ChatIslam to save your conversations and access the AI Tutor.',
}

export default function SignInPage() {
  return <SignInClient />
}
