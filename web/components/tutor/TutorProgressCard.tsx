'use client'

/**
 * ChatIslam — TutorProgressCard component (CB-03 T23)
 *
 * Shows a summary card for a tutor learning path session:
 *   - Path title and slug
 *   - Completion percentage (progress bar)
 *   - Average mastery score
 *   - Current level
 *   - Streak days
 *   - Last active timestamp
 */

interface TutorProgressData {
  session_id:        string
  path_id:           string
  path_slug:         string
  path_title:        string
  current_lesson_id: string | null
  level:             string
  avg_mastery:       number
  lessons_completed: number
  total_lessons:     number
  completion_pct:    number
  streak_days:       number
  last_active_at:    string | null
  completed_at:      string | null
}

interface TutorProgressCardProps {
  progress:  TutorProgressData
  onResume?: (sessionId: string, pathSlug: string) => void
}

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  beginner:     { label: 'Beginner',     color: 'text-green-600 dark:text-green-400' },
  intermediate: { label: 'Intermediate', color: 'text-blue-600 dark:text-blue-400'  },
  advanced:     { label: 'Advanced',     color: 'text-purple-600 dark:text-purple-400' },
}

export function TutorProgressCard({ progress, onResume }: TutorProgressCardProps) {
  const levelInfo = LEVEL_LABELS[progress.level] ?? { label: progress.level, color: 'text-gray-600' }
  const isComplete = !!progress.completed_at

  const lastActive = progress.last_active_at
    ? new Date(progress.last_active_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  return (
    <article
      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
      aria-label={`Progress for ${progress.path_title}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{progress.path_title}</h3>
          <p className={`text-xs ${levelInfo.color}`}>{levelInfo.label}</p>
        </div>
        {isComplete && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            Complete
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{progress.lessons_completed}/{progress.total_lessons} lessons</span>
          <span>{progress.completion_pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
            style={{ width: `${progress.completion_pct}%` }}
            role="progressbar"
            aria-valuenow={progress.completion_pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress.completion_pct}% complete`}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Mastery: <strong className="text-gray-700 dark:text-gray-300">{progress.avg_mastery}%</strong></span>
        {progress.streak_days > 0 && (
          <span>🔥 {progress.streak_days} day streak</span>
        )}
        {lastActive && (
          <span>Last active: {lastActive}</span>
        )}
      </div>

      {/* Resume button */}
      {!isComplete && onResume && (
        <button
          onClick={() => onResume(progress.session_id, progress.path_slug)}
          className="w-full rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          Continue learning
        </button>
      )}
    </article>
  )
}

export default TutorProgressCard
