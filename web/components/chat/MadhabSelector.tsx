'use client'

/**
 * ChatIslam — Madhab Preference Selector (SCI-14)
 *
 * Optional dropdown in the chat settings panel.
 * Default: Hanbali (per theological guidelines).
 * Selected madhab is sent with each /api/chat request to tune the system prompt.
 */

export type Madhab = 'hanbali' | 'shafii' | 'maliki' | 'hanafi' | 'dhahiri' | 'unspecified'

interface MadhabSelectorProps {
  value:    Madhab
  onChange: (madhab: Madhab) => void
}

const MADHAB_OPTIONS: Array<{ value: Madhab; label: string }> = [
  { value: 'hanbali',    label: 'Hanbali (default)' },
  { value: 'shafii',     label: "Shafi'i" },
  { value: 'maliki',     label: 'Maliki' },
  { value: 'hanafi',     label: 'Hanafi' },
  { value: 'dhahiri',    label: 'Dhahiri (Literalist)' },
  { value: 'unspecified', label: 'No preference' },
]

export default function MadhabSelector({ value, onChange }: MadhabSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label
        htmlFor="madhab-select"
        style={{ fontSize: '0.75rem', color: 'rgba(201, 242, 122, 0.7)', fontWeight: 600 }}
      >
        Madhab preference
      </label>
      <select
        id="madhab-select"
        value={value}
        onChange={(e) => onChange(e.target.value as Madhab)}
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
        {MADHAB_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
