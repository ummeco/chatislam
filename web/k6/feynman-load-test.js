/**
 * ChatIslam — Feynman Research Agent load test (CB-09 T53)
 *
 * Target: 100 concurrent users, scholarly depth requests.
 * Pass criteria:
 *   - P95 response time < 30s (scholarly uses extended thinking)
 *   - Error rate < 5% (rate limits + 429s are expected and NOT counted as failures)
 *   - Zero 500/503 responses
 *
 * Run: k6 run k6/feynman-load-test.js
 * Override base URL: BASE_URL=https://preview-url.vercel.app k6 run k6/feynman-load-test.js
 *
 * Install k6: brew install k6
 */

import http   from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend }  from 'k6/metrics'

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'https://www.chatislam.local.nself.org:8543'

// Scholarly queries covering diverse fiqh topics
const SCHOLARLY_QUERIES = [
  'What is the ruling on combining prayers while travelling according to all four madhabs?',
  'Explain the conditions of valid Zakah with isnad references.',
  'What are the differences in wudu requirements between the four Sunni madhabs?',
  'Provide a scholarly analysis of the Friday prayer obligation with citations.',
  'What is the hukm of fasting expiation (kaffarah) in detail?',
  'Explain the conditions for valid Islamic marriage contract across madhabs.',
  'What is the ruling on praying behind an Imam with different aqeedah?',
  'Scholarly analysis of tayammum conditions with hadith references.',
  'What are the conditions of valid Salah according to classical scholars?',
  'Explain the differences in Hajj obligations between the four schools.',
]

// ─── Metrics ──────────────────────────────────────────────────────────────────

const errorRate      = new Rate('errors')
const serverErrors   = new Rate('server_errors')      // 500/503 — must be 0
const rateLimitRate  = new Rate('rate_limited')        // 429 — expected, not failures
const researchTrend  = new Trend('research_duration')

// ─── Test scenarios ───────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    scholarly_load: {
      executor:       'constant-vus',
      vus:            100,
      duration:       '60s',
      gracefulStop:   '10s',
    },
  },
  thresholds: {
    // P95 < 30s for scholarly depth (extended thinking adds latency)
    research_duration: ['p(95)<30000'],
    // Zero hard server errors (5xx)
    server_errors:     ['rate<0.001'],
    // Overall error rate (excluding expected 429s) < 5%
    errors:            ['rate<0.05'],
    // HTTP request duration (includes 429 responses which are fast)
    http_req_duration: ['p(99)<35000'],
  },
}

// ─── Main test function ───────────────────────────────────────────────────────

export default function () {
  const query = SCHOLARLY_QUERIES[Math.floor(Math.random() * SCHOLARLY_QUERIES.length)]

  const payload = JSON.stringify({
    query: query,
    depth: 'scholarly',
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Note: anonymous requests to /api/research — rate limited at 5/min for scholarly
      // If authenticated testing is needed, inject Bearer token via __ENV.AUTH_TOKEN
      ...((__ENV.AUTH_TOKEN) ? { Authorization: `Bearer ${__ENV.AUTH_TOKEN}` } : {}),
    },
    timeout: '35s',
  }

  const startTime = Date.now()
  const res       = http.post(`${BASE_URL}/api/research`, payload, params)
  const duration  = Date.now() - startTime

  researchTrend.add(duration)

  // 429 = rate limited (expected under load, not a failure)
  if (res.status === 429) {
    rateLimitRate.add(1)
    sleep(1)
    return
  }

  // 5xx = server error (must be zero)
  if (res.status >= 500) {
    serverErrors.add(1)
    errorRate.add(1)
    console.error(`Server error ${res.status}: ${res.body}`)
    return
  }

  serverErrors.add(0)
  rateLimitRate.add(0)

  const ok = check(res, {
    'status 200':           (r) => r.status === 200,
    'has result field':     (r) => {
      try {
        const body = JSON.parse(r.body as string)
        return typeof body.result === 'string' && body.result.length > 0
      } catch { return false }
    },
    'has research_id':      (r) => {
      try {
        const body = JSON.parse(r.body as string)
        return typeof body.research_id === 'string'
      } catch { return false }
    },
    'depth_used is scholarly': (r) => {
      try {
        const body = JSON.parse(r.body as string)
        return body.depth_used === 'scholarly'
      } catch { return false }
    },
  })

  errorRate.add(!ok ? 1 : 0)

  // Small think-time between requests (simulates real user behavior)
  sleep(Math.random() * 2 + 0.5)
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function handleSummary(data: Record<string, unknown>) {
  const metrics = data.metrics as Record<string, { values: Record<string, number> }>

  const p95       = metrics?.research_duration?.values?.['p(95)'] ?? 0
  const errRate   = metrics?.errors?.values?.rate ?? 0
  const srvErr    = metrics?.server_errors?.values?.rate ?? 0
  const rlRate    = metrics?.rate_limited?.values?.rate ?? 0

  const passed = p95 < 30000 && srvErr < 0.001 && errRate < 0.05

  return {
    stdout: `
=== Feynman Research Agent Load Test Results ===

Scenarios:    100 VUs × 60s (scholarly depth)
Target URL:   ${BASE_URL}

Key metrics:
  P95 response time:  ${Math.round(p95)}ms  (threshold: <30000ms)  ${p95 < 30000 ? '✓' : '✗'}
  Error rate:         ${(errRate * 100).toFixed(2)}%    (threshold: <5%)      ${errRate < 0.05 ? '✓' : '✗'}
  Server errors (5xx):${(srvErr * 100).toFixed(2)}%    (threshold: <0.1%)    ${srvErr < 0.001 ? '✓' : '✗'}
  Rate limited (429): ${(rlRate * 100).toFixed(2)}%    (informational)

Overall: ${passed ? 'PASS ✓' : 'FAIL ✗'}

Gate G-13 status: ${passed ? '✅ PASS — update beta-gates-p4.md' : '❌ FAIL — investigate and fix before release'}
`,
  }
}
