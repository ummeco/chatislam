import type { Metadata } from 'next'
import Link from 'next/link'

// LAST_UPDATED: 2026-04-25
// DRAFT — under legal review. Shipping for development purposes; will be replaced before public launch.

export const metadata: Metadata = {
  title: 'Privacy Policy — ChatIslam',
  description: 'ChatIslam privacy policy. How we collect, use, and protect your data, including AI conversation handling.',
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm opacity-50">Last updated: April 25, 2026</p>
        </div>

        <div className="space-y-8 opacity-80 leading-relaxed">

          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Who We Are</h2>
            <p>
              ChatIslam is operated by <strong>Ummat</strong>, an Islamic technology organization (501(c)(3) application pending). We operate <a href="https://chatislam.org" className="underline opacity-90">chatislam.org</a>, an AI-powered Islamic question-and-answer and dawah platform.
            </p>
            <p className="mt-2">
              <strong>Data controller:</strong> Ummat &mdash; <a href="mailto:privacy@ummat.dev" className="underline opacity-90">privacy@ummat.dev</a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. What We Collect</h2>
            <p className="mb-2">Data you provide:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li><strong>Account information:</strong> email address and display name when you create an account.</li>
              <li><strong>Conversation content:</strong> questions and messages you submit to ChatIslam. These are used to generate AI responses and may be reviewed for quality and safety.</li>
              <li><strong>Feedback:</strong> ratings or corrections you submit on AI responses.</li>
            </ul>
            <p className="mb-2 mt-4">Data collected automatically:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li><strong>Usage data:</strong> features used, session duration, error reports.</li>
              <li><strong>Device information:</strong> device type, OS version, browser type and version.</li>
              <li><strong>IP address:</strong> rate limiting and geographic routing. Not stored beyond 30 days.</li>
            </ul>
            <p className="mt-4">
              We do <strong>not</strong> sell your data. We do <strong>not</strong> build advertising profiles. Your conversations are not used to train third-party AI models without your explicit opt-in.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. AI Conversation Handling</h2>
            <div className="rounded-lg border border-white/20 bg-white/5 p-4">
              <p className="mb-2 font-semibold">How we handle your conversations:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li><strong>Active retention:</strong> Conversation history is retained for 30 days to allow you to continue previous conversations and access your history.</li>
                <li><strong>Anonymization:</strong> After 30 days, conversations are anonymized (personal identifiers removed) and retained for up to 12 months for quality improvement.</li>
                <li><strong>Deletion:</strong> You can delete your conversation history at any time from your account settings. Deletion is permanent.</li>
                <li><strong>AI training opt-out:</strong> We do not use your identified conversations to fine-tune AI models. Anonymous aggregate data may be used to improve response quality. You can opt out in account settings.</li>
                <li><strong>Third-party AI:</strong> Your conversation text is sent to Anthropic (Claude API) for response generation. Anthropic&rsquo;s data processing is covered by a Data Processing Agreement (DPA) and Standard Contractual Clauses.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. How We Use It</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Generate AI responses to your Islamic questions.</li>
              <li>Maintain your conversation history (30-day active window).</li>
              <li>Improve the accuracy and quality of responses.</li>
              <li>Send transactional emails (account verification, password reset).</li>
              <li>Detect and prevent abuse and harmful content.</li>
              <li>Comply with applicable law.</li>
            </ul>
            <p className="mt-3">
              <strong>GDPR lawful basis:</strong> contract performance, legitimate interests (safety, quality), legal obligation.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Who We Share With</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20 opacity-60">
                    <th className="pb-2 text-left pr-4">Vendor</th>
                    <th className="pb-2 text-left pr-4">Purpose</th>
                    <th className="pb-2 text-left">Country / Safeguard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr><td className="py-2 pr-4">Hetzner Online GmbH</td><td className="py-2 pr-4">Server hosting</td><td className="py-2">Germany (EU)</td></tr>
                  <tr><td className="py-2 pr-4">Vercel Inc.</td><td className="py-2 pr-4">Web hosting</td><td className="py-2">USA/EU — SCCs</td></tr>
                  <tr><td className="py-2 pr-4">Cloudflare Inc.</td><td className="py-2 pr-4">CDN, DNS</td><td className="py-2">USA/EU — SCCs</td></tr>
                  <tr><td className="py-2 pr-4">Anthropic PBC</td><td className="py-2 pr-4">AI inference (conversation responses)</td><td className="py-2">USA — SCCs + DPA</td></tr>
                  <tr><td className="py-2 pr-4">Elastic Email Inc.</td><td className="py-2 pr-4">Transactional email</td><td className="py-2">USA/EU — SCCs</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm opacity-70">
              Full sub-processor list: <a href="https://ummat.pro/legal/sub-processors" className="underline">ummat.pro/legal/sub-processors</a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Your Rights</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li><strong>Access</strong> — request a copy of all data we hold about you, including conversation history.</li>
              <li><strong>Correct</strong> — ask us to fix inaccurate data.</li>
              <li><strong>Delete</strong> — delete your account, conversation history, and all associated data.</li>
              <li><strong>Port</strong> — receive your data in machine-readable format.</li>
              <li><strong>Restrict / Object</strong> — limit or object to certain processing.</li>
            </ul>
            <p className="mt-3">
              GDPR / UK-GDPR: Articles 15&ndash;22 apply. Response within 30 days. CCPA/CPRA: we do not sell your data.
            </p>
            <p className="mt-2">Email: <a href="mailto:privacy@ummat.dev" className="underline">privacy@ummat.dev</a></p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Children</h2>
            <p>
              ChatIslam is not directed at children under 13 (US) or under 16 (EU). We do not knowingly collect data from minors below these ages. Contact <a href="mailto:privacy@ummat.dev" className="underline">privacy@ummat.dev</a> if you believe a child has provided data without parental consent.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Retention</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Account data: until deletion + 30-day grace period.</li>
              <li>Active conversation history: 30 days.</li>
              <li>Anonymized conversation data: up to 12 months.</li>
              <li>Server logs (incl. IP): 30 days.</li>
              <li>Anonymized analytics: up to 24 months.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. International Transfers</h2>
            <p>
              Our servers are in <strong>Falkenstein, Germany (EU)</strong> via Hetzner. Your conversation data is sent to Anthropic (USA) for AI processing, covered by Standard Contractual Clauses (EU 2021/914, Module 2) and a Data Processing Agreement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Security</h2>
            <p>
              TLS 1.3 for all data in transit. Encryption at rest for sensitive fields. Conversation data is isolated per user via role-based access control. Security disclosures: <a href="mailto:security@ummat.dev" className="underline">security@ummat.dev</a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">11. Contact</h2>
            <p>
              Privacy: <a href="mailto:privacy@ummat.dev" className="underline">privacy@ummat.dev</a><br />
              Security: <a href="mailto:security@ummat.dev" className="underline">security@ummat.dev</a><br />
              <br />
              <strong>Ummat</strong> (501(c)(3) application pending) &mdash; United States
            </p>
          </section>

          <div className="mt-8 border-t border-white/10 pt-6 text-sm opacity-50">
            <Link href="/terms" className="mr-4 hover:opacity-80 transition-opacity">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:opacity-80 transition-opacity">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
