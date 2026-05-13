/**
 * ChatIslam — Client-side Web Vitals instrumentation
 *
 * T-P7-Q-PERF-07 — Measure INP, LCP, CLS, TTFB, FCP and post each as a
 * Umami custom event so per-route p95 trends can be visualised against the
 * per-route-shape budgets in `.github/wiki/standards/performance-budgets.md`.
 *
 * Uses native PerformanceObserver (no extra npm package). Matches the same
 * metric names as the Q-PERF-13 budget table (LCP / INP / CLS / TTFB / FCP).
 *
 * Privacy: no PII captured. `route` = window.location.pathname only.
 * Consent: Umami is privacy-preserving (D-P3-21); no cookie consent needed.
 *
 * Next.js: this file is auto-imported in the BROWSER bundle when located at
 * the project root. No register() export needed; top-level code runs once.
 */

type VitalName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP'
type Rating = 'good' | 'needs-improvement' | 'poor'

const THRESHOLDS: Record<VitalName, { good: number; poor: number }> = {
  LCP:  { good: 2500, poor: 4000 },
  INP:  { good: 200,  poor: 500  },
  CLS:  { good: 0.1,  poor: 0.25 },
  TTFB: { good: 800,  poor: 1800 },
  FCP:  { good: 1800, poor: 3000 },
}

function rate(name: VitalName, value: number): Rating {
  const t = THRESHOLDS[name]
  return value <= t.good ? 'good' : value <= t.poor ? 'needs-improvement' : 'poor'
}

function report(name: VitalName, value: number): void {
  if (typeof window === 'undefined') return
  window.umami?.track('web_vital', {
    name,
    value: Math.round(value * 1000) / 1000,
    rating: rate(name, value),
    route: window.location.pathname,
  })
}

function observeLCP(): void {
  try {
    let last = 0
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        const e = entry as PerformanceEntry & { renderTime?: number; loadTime?: number }
        last = Math.max(last, e.renderTime ?? e.loadTime ?? entry.startTime)
      }
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
    const flush = () => {
      if (last > 0) report('LCP', last)
      observer.disconnect()
    }
    addEventListener('visibilitychange', flush, { once: true })
    addEventListener('pagehide', flush, { once: true })
  } catch { /* PerformanceObserver unavailable */ }
}

function observeCLS(): void {
  try {
    let cls = 0
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        if (!e.hadRecentInput && typeof e.value === 'number') cls += e.value
      }
    })
    observer.observe({ type: 'layout-shift', buffered: true })
    const flush = () => {
      report('CLS', cls)
      observer.disconnect()
    }
    addEventListener('visibilitychange', flush, { once: true })
    addEventListener('pagehide', flush, { once: true })
  } catch { /* skip */ }
}

function observeINP(): void {
  try {
    let worst = 0
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (entry.duration > worst) worst = entry.duration
      }
    })
    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit)
    const flush = () => {
      if (worst > 0) report('INP', worst)
      observer.disconnect()
    }
    addEventListener('visibilitychange', flush, { once: true })
    addEventListener('pagehide', flush, { once: true })
  } catch { /* event-timing unsupported pre-Chrome 96 */ }
}

function observeTTFB(): void {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (!nav) return
    const ttfb = nav.responseStart - nav.startTime
    if (ttfb > 0) report('TTFB', ttfb)
  } catch { /* skip */ }
}

function observeFCP(): void {
  try {
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          report('FCP', entry.startTime)
          observer.disconnect()
        }
      }
    })
    observer.observe({ type: 'paint', buffered: true })
  } catch { /* skip */ }
}

if (typeof window !== 'undefined') {
  observeLCP()
  observeCLS()
  observeINP()
  observeTTFB()
  observeFCP()
}
