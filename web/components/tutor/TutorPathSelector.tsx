'use client'

/**
 * ChatIslam — TutorPathSelector component (CB-03 T22)
 *
 * Grid of available learning paths fetched from GET /api/tutor/paths.
 * Each card shows: title, description, audience, level, lesson count.
 * Calls onSelect(path) when user clicks a path.
 */

import { useState, useEffect } from 'react'

interface TutorPath {
  id:           string
  slug:         string
  title:        string
  description:  string
  audience:     string
  level:        string
  sort_order:   number
  lesson_count: number
}

interface TutorPathSelectorProps {
  onSelect:  (path: TutorPath) => void
  disabled?: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  advanced:     'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

export function TutorPathSelector({ onSelect, disabled = false }: TutorPathSelectorProps) {
  const [paths,     setPaths]     = useState<TutorPath[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    async function fetchPaths() {
      try {
        const res = await fetch('/api/tutor/paths')
        if (!res.ok) throw new Error('Failed to load paths')
        const data = await res.json() as { paths: TutorPath[] }
        setPaths(data.paths)
      } catch {
        setError('Could not load learning paths. Please refresh.')
      } finally {
        setIsLoading(false)
      }
    }
    void fetchPaths()
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading paths">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 motion-safe:animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list" aria-label="Learning paths">
      {paths.map((path) => (
        <button
          key={path.id}
          role="listitem"
          onClick={() => !disabled && onSelect(path)}
          disabled={disabled}
          className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950"
          aria-label={`Start ${path.title}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">{path.title}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs capitalize ${LEVEL_COLORS[path.level] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
              {path.level}
            </span>
          </div>
          <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{path.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
            <span>{path.lesson_count} lesson{path.lesson_count !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span className="capitalize">{path.audience}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

export default TutorPathSelector
