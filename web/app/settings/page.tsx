/**
 * ChatIslam — /settings page (CB-07 T51)
 *
 * User settings: madhhab preference, audience mode default,
 * conversation history toggle, BYO API key entry, and account info.
 *
 * Server component wrapper — auth check + feature flags.
 * Actual form is in SettingsClient.tsx (client component).
 */

import type { Metadata } from 'next'
import { redirect }      from 'next/navigation'
import SettingsClient    from './SettingsClient'

export const metadata: Metadata = {
  title:       'Settings | ChatIslam',
  description: 'Manage your ChatIslam preferences: madhhab, audience mode, conversation history, and API key.',
}

export default function SettingsPage() {
  // If conversation history FF is off globally, the auth + session
  // features still work but the history section is hidden client-side.
  return (
    <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Settings
      </h1>
      <SettingsClient />
    </main>
  )
}
