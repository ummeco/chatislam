'use client'

/**
 * ChatIslam — Audience Mode Selector (SCI-15)
 *
 * Header selector that overrides auto-detected audience mode.
 * Mid-session change applies immediately to the next message.
 *
 * Three modes: Muslim | NewMuslim | NonMuslim
 */

import type { AudienceMode } from '../../lib/audience-detection'

interface AudienceModeProps {
  value:    AudienceMode
  onChange: (mode: AudienceMode) => void
  /** If true, render compact chip-style selector */
  compact?: boolean
}

const AUDIENCE_OPTIONS: Array<{ value: AudienceMode; label: string; description: string }> = [
  { value: 'Muslim',    label: 'Muslim',      description: 'Scholarly, with citations' },
  { value: 'NewMuslim', label: 'New Muslim',   description: 'Step-by-step, encouraging' },
  { value: 'NonMuslim', label: 'Non-Muslim',   description: 'Bridge-building, dawah' },
]

export default function AudienceModeSelector({ value, onChange, compact = false }: AudienceModeProps) {
  if (compact) {
    return (
      <div role="group" aria-label="Audience mode" style={{ display: 'flex', gap: '0.375rem' }}>
        {AUDIENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            title={opt.description}
            style={{
              padding:         '0.25rem 0.625rem',
              fontSize:        '0.75rem',
              borderRadius:    '999px',
              border:          '1px solid',
              cursor:          'pointer',
              backgroundColor: value === opt.value ? '#1e5e2f' : 'transparent',
              borderColor:     value === opt.value ? '#79C24C' : '#2d5a35',
              color:           value === opt.value ? '#C9F27A' : 'rgba(201, 242, 122, 0.6)',
              fontWeight:      value === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label
        htmlFor="audience-select"
        style={{ fontSize: '0.75rem', color: 'rgba(201, 242, 122, 0.7)', fontWeight: 600 }}
      >
        Audience mode
      </label>
      <select
        id="audience-select"
        value={value}
        onChange={(e) => onChange(e.target.value as AudienceMode)}
        style={{
          backgroundColor: '#0d2f17',
          color:           '#C9F27A',
          border:          '1px solid #2d5a35',
          borderRadius:    '0.375rem',
          padding:         '0.375rem 0.5rem',
          fontSize:        '0.875rem',
          cursor:          'pointer',
        }}
      >
        {AUDIENCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} — {opt.description}
          </option>
        ))}
      </select>
    </div>
  )
}
