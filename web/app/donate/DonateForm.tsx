'use client'

import { useState } from 'react'
import Link from 'next/link'

const ACCENT   = '#79C24C'
const AMOUNTS  = [500, 1000, 2500, 5000, 10000] // cents

export default function DonateForm() {
  const [amountCents, setAmountCents] = useState(1000)
  const [custom,      setCustom]      = useState('')
  const [coverFee,    setCoverFee]    = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const effective = coverFee ? Math.ceil(amountCents * 1.03) : amountCents
  const dollars   = (effective / 100).toFixed(2)

  async function handleDonate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/donations/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designation:      'chatislam',
          amountCents,
          frequency:        'one_time',
          isAnonymous,
          donorDisplayName: isAnonymous ? undefined : displayName || undefined,
          coverFee,
        }),
      })
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`)
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Link href="/" className="mb-8 inline-block text-sm opacity-60 hover:opacity-90 transition-opacity">
          ← Back to ChatIslam
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Support ChatIslam</h1>
          <p className="mt-2 opacity-70">Keep Islamic AI guidance free for all Muslims.</p>
        </div>

        <div className="space-y-6">
          {/* Amount selector */}
          <div>
            <p className="mb-2 text-sm font-medium opacity-70">Choose an amount</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAmountCents(a); setCustom('') }}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    amountCents === a && !custom
                      ? 'border-transparent'
                      : 'border-white/20 opacity-70 hover:opacity-100'
                  }`}
                  style={amountCents === a && !custom ? { backgroundColor: ACCENT, color: '#0D2F17' } : {}}
                >
                  ${(a / 100).toFixed(0)}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              placeholder="Custom amount ($)"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value)
                const v = Math.round(parseFloat(e.target.value) * 100)
                if (v > 0) setAmountCents(v)
              }}
              className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </div>

          {/* Cover fee */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={coverFee}
              onChange={(e) => setCoverFee(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm opacity-70">Cover the 3% processing fee so ChatIslam receives the full amount</span>
          </label>

          {/* Anonymous */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <span className="text-sm opacity-70">Donate anonymously</span>
          </label>

          {!isAnonymous && (
            <input
              type="text"
              placeholder="Your name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          )}

          <p className="text-xs opacity-40">
            ChatIslam is a project of Ummat, a registered US nonprofit. Donations may be
            tax-deductible. A receipt will be emailed to you after checkout.
          </p>

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleDonate}
            disabled={loading || amountCents < 100}
            aria-busy={loading}
            className="w-full rounded-lg py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ backgroundColor: ACCENT, color: '#0D2F17' }}
          >
            {loading ? 'Redirecting to checkout…' : `Donate $${dollars}`}
          </button>
        </div>
      </div>
    </main>
  )
}
