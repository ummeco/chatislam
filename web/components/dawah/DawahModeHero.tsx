'use client'

/**
 * ChatIslam — DawahModeHero component (CB-04 T29)
 *
 * Welcome hero section for the /dawah page.
 * Gentle, non-presumptuous introduction to Islam and ChatIslam.
 * Links to starting a conversation, asking questions, or learning more.
 */

interface DawahModeHeroProps {
  onAskQuestion?: () => void
}

export function DawahModeHero({ onAskQuestion }: DawahModeHeroProps) {
  return (
    <section
      className="mx-auto max-w-2xl px-4 py-12 text-center"
      aria-label="Welcome to ChatIslam"
    >
      {/* Icon */}
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900">
          <svg
            className="h-10 w-10 text-emerald-600 dark:text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
        Ask anything about Islam
      </h1>

      <p className="mb-3 text-lg text-gray-600 dark:text-gray-400">
        Curious about Islam? This is a safe space for honest questions.
      </p>

      <p className="mb-8 text-sm text-gray-500 dark:text-gray-500">
        No pressure, no judgment. Just clear, respectful answers — whether you are exploring,
        skeptical, or just curious about what Muslims believe and practice.
      </p>

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onAskQuestion}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 sm:w-auto"
        >
          Ask a question
        </button>
        <a
          href="/research"
          className="w-full rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 sm:w-auto"
        >
          Research a topic
        </a>
      </div>

      {/* Sample questions */}
      <div className="mt-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-600">
          Common questions
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'What are the five pillars of Islam?',
            'Who was Prophet Muhammad?',
            'What does the Quran say about Jesus?',
            'Why do Muslim women wear hijab?',
            'Is Allah the same as the Christian God?',
            'What is halal food?',
          ].map((q) => (
            <button
              key={q}
              onClick={onAskQuestion}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-gray-400 dark:text-gray-600">
        ChatIslam provides informational responses based on classical Islamic scholarship.
        Responses are AI-generated — for personal religious decisions, consult a qualified scholar.
      </p>
    </section>
  )
}

export default DawahModeHero
