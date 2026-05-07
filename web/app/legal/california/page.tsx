import type { Metadata } from 'next'
import Link from 'next/link'

// S05-09: CCPA disclosure page — chatislam.org
// TODO(U-15): Replace placeholder copy with counsel-reviewed text before publishing.
// DO NOT publish to prod until U-15 is resolved (TRAP-P6 do-not-publish rule).
// LAST_UPDATED: 2026-05-06

export const metadata: Metadata = {
  title: 'California Privacy Rights — ChatIslam',
  description: 'California Consumer Privacy Act (CCPA/CPRA) disclosure for ChatIslam. Your right to know, delete, and opt out.',
  robots: { index: false }, // U-15: unpublished until counsel review
}

export default function CaliforniaPrivacyPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Draft — do not publish until U-15 resolved */}
        <div className="mb-8 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          <strong>DRAFT — Not yet effective.</strong> Counsel copy pending (U-15). This page is committed for development review only. Do not index or link from production footers until U-15 is resolved.
        </div>

        <Link href="/privacy" className="mb-8 inline-block text-sm opacity-60 hover:opacity-90 transition-opacity">
          &larr; Back to Privacy Policy
        </Link>

        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">California Privacy Rights</h1>
        <p className="mt-3 mb-4 text-sm opacity-50">
          California Consumer Privacy Rights Act (CPRA) — Last updated: May 6, 2026
        </p>
        <p className="mb-10 opacity-70 max-w-2xl text-sm leading-relaxed">
          This page describes the privacy rights available to California residents under the California Consumer
          Privacy Rights Act (CPRA/CCPA). ChatIslam is operated by Ummeco, LLC.
          {/* TODO(U-15): Insert full legal entity and registered agent details. */}
        </p>

        {/* Do Not Sell — prominent */}
        <div className="mb-10 rounded-xl border border-[#1E5E2F]/40 bg-[#0D2F17]/40 px-6 py-6">
          <h2 className="text-base font-semibold mb-2">Do Not Sell or Share My Personal Information</h2>
          <p className="text-sm opacity-60 mb-4">
            {/* TODO(U-15): Confirm data-sharing practices with counsel before publishing. */}
            Ummeco, LLC does not sell personal information to third parties. We do not share personal
            information for cross-context behavioural advertising.
          </p>
          <a
            href="mailto:privacy@ummat.dev?subject=CPRA%20Opt-Out%20Request&body=Full%20name%3A%0AEmail%3A%0ARequest%3A%20Do%20not%20sell%20or%20share%20my%20personal%20information."
            className="inline-flex items-center gap-2 rounded-lg bg-[#79C24C] px-5 py-2.5 text-sm font-medium text-[#0D2F17] hover:bg-[#C9F27A] transition-colors"
          >
            Submit Opt-Out Request — privacy@ummat.dev
          </a>
        </div>

        <div className="space-y-10 opacity-80 leading-relaxed text-sm">

          <section>
            <h2 className="text-xl font-semibold mb-3">Categories of Personal Information We Collect</h2>
            {/* TODO(U-15): Verify table rows with counsel — especially AI conversation data classification. */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 opacity-60 font-medium">Category</th>
                    <th className="text-left py-2 pr-4 opacity-60 font-medium">Examples</th>
                    <th className="text-left py-2 opacity-60 font-medium">Collected?</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Identifiers', 'Email address, account ID', 'Yes'],
                    ['Internet activity', 'Questions submitted to AI, conversation history', 'Yes'],
                    ['Geolocation', 'Country/region via IP (not precise GPS)', 'Yes'],
                    ['Commercial information', 'None — free service', 'No'],
                    ['Inferences', 'No user profiles or inferences drawn', 'No'],
                    ['Sensitive personal information', 'Religious/spiritual questions (per CPRA § 1798.140)', 'Yes — see note'],
                  ].map(([cat, ex, col]) => (
                    <tr key={cat} className="border-b border-white/5">
                      <td className="py-2 pr-4 font-medium">{cat}</td>
                      <td className="py-2 pr-4 opacity-50">{ex}</td>
                      <td className={`py-2 font-medium text-xs ${col === 'Yes' ? 'text-[#C9F27A]' : col === 'No' ? 'opacity-30' : 'text-yellow-400'}`}>{col}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs opacity-50">
              {/* TODO(U-15): Confirm classification of religious queries under CPRA "sensitive personal information". */}
              Note on sensitive personal information: AI conversation content may contain religious questions. This content is used only to provide the AI response and is not used for advertising or inference profiles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Your California Rights</h2>
            <h3 className="text-base font-semibold mt-4">Right to Know</h3>
            <p>You may request disclosure of the categories and specific pieces of personal information we have collected about you, the categories of sources, and the purpose for collection.</p>

            <h3 className="text-base font-semibold mt-4">Right to Delete</h3>
            <p>You may request deletion of personal information we have collected, subject to exceptions for legal obligations, fraud prevention, and service completion.</p>

            <h3 className="text-base font-semibold mt-4">Right to Correct</h3>
            <p>You may request correction of inaccurate personal information. Most information can be updated directly in your account settings.</p>

            <h3 className="text-base font-semibold mt-4">Right to Opt-Out of Sale or Sharing</h3>
            <p>We do not sell personal information. The opt-out link above is provided for completeness.</p>

            <h3 className="text-base font-semibold mt-4">Right to Limit Use of Sensitive Personal Information</h3>
            <p>
              {/* TODO(U-15): Confirm exact CPRA § 1798.121 language with counsel for religious data context. */}
              You have the right to limit our use of sensitive personal information. We use conversation content only to provide the AI service. No additional uses apply.
            </p>

            <h3 className="text-base font-semibold mt-4">Right to Non-Discrimination</h3>
            <p>We will not discriminate against you for exercising your CPRA rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How to Submit a Request</h2>
            <p>Email <a href="mailto:privacy@ummat.dev" className="text-[#79C24C] hover:underline">privacy@ummat.dev</a> with subject line &quot;CPRA Request&quot;. Include your full name and the email associated with your account.</p>
            <p className="mt-2">We respond within 45 days (extendable to 90 days with notice). Up to two free requests per 12-month period.</p>
          </section>

          {/* Cross-links */}
          <section className="border-t border-white/10 pt-6">
            <h2 className="text-lg font-semibold mb-3">Related</h2>
            <ul className="space-y-1">
              <li><Link href="/privacy" className="text-[#79C24C] hover:underline">Privacy Policy</Link></li>
              <li><Link href="/preferences" className="text-[#79C24C] hover:underline">Manage Cookie Preferences</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}
