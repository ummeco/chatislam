/**
 * ChatIslam — Sign up page (CB-07 T42b)
 */

import type { Metadata } from 'next'
import { SignUpClient } from './SignUpClient'

// force-dynamic: page contains auth state (Turnstile, redirect checks) that must not be statically prerendered
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title:       'Create Account | ChatIslam',
  description: 'Create a ChatIslam account to save your conversations and access the AI Tutor.',
}

export default function SignUpPage() {
  return <SignUpClient />
}
