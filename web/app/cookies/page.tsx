import type { Metadata } from 'next'
import Link from 'next/link'

// LAST_UPDATED: 2026-04-25
// DRAFT — under legal review. Shipping for development purposes; will be replaced before public launch.

export const metadata: Metadata = {
  title: 'Cookie Policy — ChatIslam',
  description: 'ChatIslam cookie policy. What cookies we use and how to control them.',
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Draft banner */}
        <div className="mb-8 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          <strong>DRAFT</strong> — This policy is under legal review (2026-04-25). Published for development purposes; will be replaced before public launch.
        </div>

        <div className="mb-12">
          <Link href="/" className="mb-6 inline-block text-sm opacity-60 hover:opacity-90 transition-opacity">
            ← Back to ChatIslam
          </Link>
          <h1 className="text-3xl font-bold sm:text-4xl">Cookie Policy</h1>
          <p className="mt-3 text-sm opacity-50">Last updated: April 25, 2026</p>
        </div>

        <div className="space-y-8 opacity-80 leading-relaxed">

          <section>
            <h2 className="mb-3 text-xl font-semibold">What Are Cookies</h2>
            <p>Cookies are small text files placed on your device when you visit a website. We use them to keep you signed in and remember your preferences.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Cookies We Use</h2>

            <h3 className="mb-2 mt-4 font-semibold opacity-90">Essential cookies (always active)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20 opacity-60">
                    <th className="pb-2 text-left pr-4">Name</th>
                    <th className="pb-2 text-left pr-4">Purpose</th>
                    <th className="pb-2 text-left">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr><td className="py-2 pr-4 font-mono text-xs">um_session</td><td className="py-2 pr-4">Keeps you signed in</td><td className="py-2">Session / 30 days</td></tr>
                  <tr><td className="py-2 pr-4 font-mono text-xs">um_csrf</td><td className="py-2 pr-4">CSRF protection</td><td className="py-2">Session</td></tr>
                  <tr><td className="py-2 pr-4 font-mono text-xs">um_consent</td><td className="py-2 pr-4">Cookie preference</td><td className="py-2">1 year</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="mb-2 mt-6 font-semibold opacity-90">Analytics cookies (opt-in only)</h3>
            <p className="text-sm">Privacy-respecting analytics only. No Google Analytics, no advertising trackers. These fire only after your consent.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Third-Party Cookies</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li><strong>Cloudflare</strong> may set <code className="text-xs bg-white/10 px-1 rounded">__cf_bm</code> for bot detection (strictly necessary).</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Your Choices</h2>
            <p>A consent banner appears on your first visit. You can change your preference at any time via cookie settings in the footer.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Contact</h2>
            <p><a href="mailto:privacy@ummat.dev" className="underline">privacy@ummat.dev</a></p>
          </section>

          <div className="mt-8 border-t border-white/10 pt-6 text-sm opacity-50">
            <Link href="/privacy" className="mr-4 hover:opacity-80 transition-opacity">Privacy Policy</Link>
            <Link href="/terms" className="hover:opacity-80 transition-opacity">Terms of Service</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
