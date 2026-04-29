/**
 * ChatIslam Widget — Layout (SCI-16)
 *
 * Minimal, iframe-safe layout. No nav, no global header.
 * CSP headers added via middleware or next.config.ts.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:  'ChatIslam Widget',
  robots: { index: false, follow: false },
}

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; overflow: hidden; }
          body { background: #0d2f17; color: #C9F27A; font-family: system-ui, sans-serif; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
