'use client'
// ClientProviders — wraps all client-only providers so the root layout stays
// a pure server component. Required because ConsentProvider + ThemeProvider
// both call useState/useEffect and cannot run during Next.js static prerendering.
// Digest fix: prevents "Cannot read properties of null (reading 'useState')"
// in Next.js 15 prerender workers.

import { ThemeProvider } from 'next-themes'
import { ConsentProvider, CookieBanner, ConsentGatedScript } from '@ummat/consent'
import type { ReactNode } from 'react'

interface ClientProvidersProps {
  children: ReactNode
  umamiWebsiteId?: string
}

export default function ClientProviders({ children, umamiWebsiteId }: ClientProvidersProps) {
  return (
    <ConsentProvider>
      <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
      {/* S30-T03: GDPR/CCPA consent banner. */}
      <CookieBanner
        strings={{
          body: 'We use cookies to improve your experience. AI conversation history is functional, not an analytics cookie, and is always on. Analytics and marketing cookies are off by default.',
        }}
        privacyPolicyUrl="/legal/privacy"
        cookiePolicyUrl="/legal/cookies"
      />
      {/* S-C-S05-T08: Umami gated behind analytics consent — GDPR Art 7 compliance. */}
      <ConsentGatedScript
        category="analytics"
        src="https://cloud.umami.is/script.js"
        data-website-id={umamiWebsiteId}
      />
    </ConsentProvider>
  )
}
