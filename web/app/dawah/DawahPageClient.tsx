'use client'

/**
 * ChatIslam — Dawah page client (CB-04 T30)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DawahModeHero } from '../../components/dawah/DawahModeHero'

export function DawahPageClient() {
  const router = useRouter()
  const [showInput, setShowInput] = useState(false)
  const [question,  setQuestion]  = useState('')

  function handleAskQuestion() {
    setShowInput(true)
    // Scroll to input
    setTimeout(() => {
      document.getElementById('dawah-question-input')?.focus()
    }, 100)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return
    // Navigate to chat with NonMuslim audience mode pre-set and prefilled query
    const params = new URLSearchParams({ q, audience: 'NonMuslim' })
    router.push(`/chat?${params.toString()}`)
  }

  return (
    <main id="main-content">
      <DawahModeHero onAskQuestion={handleAskQuestion} />

      {showInput && (
        <div className="mx-auto max-w-lg px-4 pb-12">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="dawah-question-input" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Your question
              </label>
              <textarea
                id="dawah-question-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about Islam?"
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!question.trim()}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Get an answer
            </button>
          </form>
        </div>
      )}
    </main>
  )
}
