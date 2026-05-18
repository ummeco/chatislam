'use client'

/**
 * ChatIslam — Sign in client (CB-07 T42a)
 * T09 (SEC-HARDENING): Routes through /api/auth/signin proxy for Turnstile verification.
 * Direct client→Hasura Auth calls replaced with server-side proxy.
 */

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export function SignInClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const nextPath     = searchParams.get('next') ?? '/chat'

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // T09: Turnstile token — populated by the invisible managed challenge.
  const turnstileToken = useRef<string>('')
  const turnstileRef   = useRef<HTMLDivElement>(null)

  // Mount Cloudflare Turnstile invisible widget
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => {
      if (typeof window.turnstile === 'undefined') return
      window.turnstile.render(turnstileRef.current!, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => { turnstileToken.current = token },
        'expired-callback': () => { turnstileToken.current = '' },
        appearance: 'interaction-only',
      })
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // T09: Use server-side proxy — Turnstile is verified server-side before auth
      const res = await fetch('/api/auth/signin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          password,
          turnstileToken: turnstileToken.current,
        }),
      })

      const data = await res.json() as {
        session?:  { accessToken?: string }
        error?:    string
        message?:  string
      }

      if (!res.ok || !data.session?.accessToken) {
        throw new Error(data.message ?? data.error ?? 'Sign in failed')
      }

      localStorage.setItem('chatislam_token', data.session.accessToken)
      router.push(nextPath)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12" id="main-content">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Sign in to your ChatIslam account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {/* T09: Cloudflare Turnstile invisible widget container */}
          {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          No account?{' '}
          <a href="/auth/signup" className="text-emerald-600 underline dark:text-emerald-400">
            Create one
          </a>
        </p>
      </div>
    </main>
  )
}
