/**
 * ChatIslam — /seasonal/ramadan page (CB-05 T36)
 *
 * Ramadan-themed hub page with seasonal content and chat CTA.
 * Active year-round (content is always relevant); SeasonalBanner
 * appears in the AppShell when Ramadan is active.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title:       'Ramadan | ChatIslam',
  description: 'Ramadan resources: fasting rulings, prayers, night of power, and more.',
}

const RAMADAN_TOPICS = [
  { title: 'Intention for fasting',          q: 'What is the ruling on intention (niyyah) for the Ramadan fast?' },
  { title: 'Breaking the fast (Iftar)',       q: 'What are the correct manners and dua for breaking the fast?' },
  { title: 'Night of Power (Laylat al-Qadr)', q: 'How should I seek Laylat al-Qadr and what are its signs?' },
  { title: 'Tarawih prayer',                  q: 'Is Tarawih prayer sunnah and how many rak\'ahs are recommended?' },
  { title: 'Things that break the fast',      q: 'What actions invalidate the Ramadan fast?' },
  { title: 'Zakat al-Fitr',                   q: 'What is Zakat al-Fitr and when must it be paid?' },
  { title: 'Traveling during Ramadan',        q: 'Can I break my fast when traveling and how do I make it up?' },
  { title: 'Itikaf (seclusion)',              q: 'What are the conditions and rulings for Itikaf in the last 10 days?' },
]

export default function RamadanPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl" role="img" aria-label="Crescent moon">🌙</div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Ramadan Resources
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Answers to common fasting questions, drawn from classical Islamic scholarship.
        </p>
      </div>

      {/* Topic quick-links */}
      <section aria-label="Common Ramadan topics">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Common questions
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RAMADAN_TOPICS.map((topic) => {
            const href = `/chat?q=${encodeURIComponent(topic.q)}`
            return (
              <Link
                key={topic.title}
                href={href}
                className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950"
              >
                {topic.title}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Research CTA */}
      <section className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center dark:border-indigo-800 dark:bg-indigo-950">
        <h2 className="mb-2 font-semibold text-indigo-800 dark:text-indigo-300">
          Need a deeper answer?
        </h2>
        <p className="mb-4 text-sm text-indigo-700 dark:text-indigo-400">
          Use the Feynman Research Agent for scholarly analysis with citations and madhhab breakdown.
        </p>
        <Link
          href="/research"
          className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Open Research
        </Link>
      </section>
    </main>
  )
}
