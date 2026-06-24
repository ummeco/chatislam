'use client'
/**
 * FILE:        chatislam/web/components/layout/LanguageSelector.tsx
 * PURPOSE:     Compact language selector for ChatIslam header.
 *              Sets NEXT_LOCALE cookie on selection, reloads to apply locale.
 *              Persists across page reload via cookie (1 year TTL).
 * INPUTS:      currentLocale — active locale string
 * OUTPUTS:     Globe icon dropdown with locale options
 * CONSTRAINTS:
 *   - Required locales: en, ar, ur, fa, id (5-locale AC-01 gate)
 *   - RTL locales ar/ur/fa trigger html[dir=rtl] on next page load (via layout.tsx)
 *   - Keyboard reachable; aria-expanded + aria-haspopup; role="listbox"
 *   - WCAG 2.1 AA: focus-visible, 4.5:1 contrast (green on dark)
 * REF:         P2-E6-W01-S01-T01 AC-02, AC-05
 */

import { useEffect, useRef, useState } from 'react'

const LOCALES = [
  { code: 'en', label: 'English',          dir: 'ltr' },
  { code: 'ar', label: 'العربية',           dir: 'rtl' },
  { code: 'ur', label: 'اردو',              dir: 'rtl' },
  { code: 'fa', label: 'فارسی',             dir: 'rtl' },
  { code: 'id', label: 'Bahasa Indonesia',  dir: 'ltr' },
] as const

function setLocaleCookie(code: string) {
  document.cookie = `NEXT_LOCALE=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
}

interface Props {
  currentLocale: string
}

export function LanguageSelector({ currentLocale }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function select(code: string) {
    setLocaleCookie(code)
    setOpen(false)
    window.location.reload()
  }

  const current = LOCALES.find((l) => l.code === currentLocale) ?? LOCALES[0]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${current.label}. Select language.`}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '0.375rem',
          padding:        '0.375rem 0.625rem',
          borderRadius:   '6px',
          border:         '1px solid rgba(121, 194, 76, 0.3)',
          background:     'transparent',
          color:          '#C9F27A',
          fontSize:       '0.8125rem',
          cursor:         'pointer',
          whiteSpace:     'nowrap',
        }}
      >
        {/* Globe icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>{current.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Select language"
          style={{
            position:        'absolute',
            top:             'calc(100% + 4px)',
            right:           0,
            minWidth:        '160px',
            background:      '#0D1F10',
            border:          '1px solid rgba(121, 194, 76, 0.3)',
            borderRadius:    '8px',
            padding:         '0.25rem 0',
            zIndex:          50,
            boxShadow:       '0 4px 16px rgba(0,0,0,0.4)',
            listStyle:       'none',
            margin:          0,
          }}
        >
          {LOCALES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === currentLocale}>
              <button
                type="button"
                onClick={() => select(l.code)}
                dir={l.dir}
                style={{
                  display:         'block',
                  width:           '100%',
                  padding:         '0.5rem 0.75rem',
                  textAlign:       l.dir === 'rtl' ? 'right' : 'left',
                  background:      l.code === currentLocale ? 'rgba(121,194,76,0.12)' : 'transparent',
                  border:          'none',
                  color:           l.code === currentLocale ? '#C9F27A' : '#9AB89A',
                  fontSize:        '0.875rem',
                  cursor:          'pointer',
                  fontWeight:      l.code === currentLocale ? 600 : 400,
                }}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
