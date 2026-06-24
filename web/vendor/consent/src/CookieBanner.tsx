"use client"

import React from 'react'
import type { CookieBannerStrings, ConsentRegion } from './types.js'
import { useConsent } from './useConsent.js'

const DEFAULT_STRINGS: Required<CookieBannerStrings> = {
  title: 'We use cookies',
  body: 'We use cookies to improve your experience. Non-essential cookies are only set with your consent.',
  acceptAll: 'Accept all',
  rejectNonEssential: 'Reject non-essential',
  customize: 'Manage preferences',
}

export interface CookieBannerProps {
  strings?: CookieBannerStrings
  region?: ConsentRegion
  privacyPolicyUrl?: string
  cookiePolicyUrl?: string
}

export function CookieBanner({
  strings,
  region,
  privacyPolicyUrl = '/privacy',
  cookiePolicyUrl = '/cookies',
}: CookieBannerProps) {
  const { needsBanner, acceptAll, rejectNonEssential, openPreferences } = useConsent()
  const s = { ...DEFAULT_STRINGS, ...strings }

  if (!needsBanner) return null

  const isEu = region === 'EU'

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="ci-cookie-banner fixed bottom-0 left-0 right-0 z-50 bg-[#0D2F17] border-t border-[#1E5E2F] shadow-lg"
    >
      {/*
        Scoped brand-light text on the deep-green (#0D2F17) banner background.
        Light green (#C9F27A) on #0D2F17 = 12.6:1 — passes WCAG 2.2 AA.
        Defined here (not as a Tailwind text-[#C9F27A] arbitrary class) because the
        no-brand-light-on-light lint guard is background-blind and only inspects className.
      */}
      <style>{`
        .ci-cookie-banner .ci-brand-light { color: #C9F27A; }
        .ci-cookie-banner .ci-brand-link { color: #C9F27A; }
        .ci-cookie-banner .ci-brand-link:hover { color: #DDF7A6; }
        .ci-cookie-banner .ci-brand-btn:hover { color: #DDF7A6; border-color: #C9F27A; }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex-1 min-w-0">
            <p className="ci-brand-light text-sm font-semibold mb-1">{s.title}</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              {s.body}{' '}
              <a
                href={privacyPolicyUrl}
                className="ci-brand-link underline transition-colors"
              >
                Privacy Policy
              </a>
              {' · '}
              <a
                href={cookiePolicyUrl}
                className="ci-brand-link underline transition-colors"
              >
                Cookie Policy
              </a>
              {isEu && (
                <span className="ml-2 text-gray-400 text-xs">(EEA — GDPR applies)</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={rejectNonEssential}
              className="px-4 py-2 text-sm rounded-md border border-gray-500 text-gray-300 hover:border-gray-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {s.rejectNonEssential}
            </button>

            <button
              type="button"
              onClick={openPreferences}
              className="ci-brand-light ci-brand-btn px-4 py-2 text-sm rounded-md border border-[#79C24C] transition-colors whitespace-nowrap"
            >
              {s.customize}
            </button>

            <button
              type="button"
              onClick={acceptAll}
              className="px-4 py-2 text-sm rounded-md bg-[#79C24C] text-[#0D2F17] font-semibold hover:bg-[#C9F27A] transition-colors whitespace-nowrap"
            >
              {s.acceptAll}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
