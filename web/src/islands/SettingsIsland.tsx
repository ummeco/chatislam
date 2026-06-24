/**
 * SettingsIsland — Settings form island (migrated from app/settings/SettingsClient.tsx · CB-07 T51)
 *
 * PURPOSE: Interactive user-settings form, hydrated client-side (client:load) from settings/index.astro.
 *
 * Sections:
 *   1. Madhhab preference (hanafi / maliki / shafii / hanbali / unspecified)
 *   2. Default audience mode (Muslim / NewMuslim / NonMuslim)
 *   3. Conversation history toggle (PUBLIC_FF_CONVERSATION_HISTORY)
 *   4. BYO API key (encrypted at rest via /api/settings/byo-key)
 *   5. Account info (sign-in state, plan tier)
 *
 * INPUTS: none (reads/writes localStorage prefixed 'ci_setting_'; BYO key → /api/settings/byo-key).
 * OUTPUTS: Settings UI.
 * CONSTRAINTS:
 *   - No Next.js imports. Feature flag read from import.meta.env.PUBLIC_FF_CONVERSATION_HISTORY.
 *   - API paths identical to the Next.js version (/api/settings/byo-key).
 */

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MadhabPreference = 'hanbali' | 'shafii' | 'maliki' | 'hanafi' | 'unspecified'
type AudienceDefault  = 'Muslim' | 'NewMuslim' | 'NonMuslim'

interface Settings {
  madhhab:             MadhabPreference
  audienceDefault:     AudienceDefault
  conversationHistory: boolean
  byoKeySet:           boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MADHAB_OPTIONS: { value: MadhabPreference; label: string }[] = [
  { value: 'hanbali',     label: "Hanbali (default)" },
  { value: 'shafii',      label: "Shafi'i" },
  { value: 'maliki',      label: "Maliki" },
  { value: 'hanafi',      label: "Hanafi" },
  { value: 'unspecified', label: "No preference (balanced)" },
]

const AUDIENCE_OPTIONS: { value: AudienceDefault; label: string; description: string }[] = [
  { value: 'Muslim',    label: 'Muslim',     description: 'Scholarly, cites sources, assumes Islamic knowledge' },
  { value: 'NewMuslim', label: 'New Muslim', description: 'Encouraging, simplified explanations, step-by-step' },
  { value: 'NonMuslim', label: 'Non-Muslim', description: 'Bridge-building, uses "God", explains terms' },
]

const FF_HISTORY = import.meta.env.PUBLIC_FF_CONVERSATION_HISTORY !== 'false'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadSettings(): Settings {
  if (typeof window === 'undefined') {
    return { madhhab: 'hanbali', audienceDefault: 'Muslim', conversationHistory: true, byoKeySet: false }
  }
  return {
    madhhab:             (localStorage.getItem('ci_setting_madhhab') as MadhabPreference) ?? 'hanbali',
    audienceDefault:     (localStorage.getItem('ci_setting_audience') as AudienceDefault) ?? 'Muslim',
    conversationHistory: localStorage.getItem('ci_setting_history') !== 'false',
    byoKeySet:           localStorage.getItem('ci_setting_byo_key_set') === 'true',
  }
}

function saveToLocalStorage(key: string, value: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsIsland() {
  // Lazy initializer calls loadSettings() once on first render — avoids setState-in-effect.
  const [settings,    setSettings]    = useState<Settings>(loadSettings)
  const [byoKeyInput, setByoKeyInput] = useState('')
  const [byoKeyMsg,   setByoKeyMsg]   = useState<string | null>(null)
  const [byoKeyBusy,  setByoKeyBusy]  = useState(false)
  const [saved,       setSaved]       = useState(false)

  function updateMadhhab(value: MadhabPreference) {
    setSettings((s) => ({ ...s, madhhab: value }))
    saveToLocalStorage('ci_setting_madhhab', value)
    flashSaved()
  }

  function updateAudience(value: AudienceDefault) {
    setSettings((s) => ({ ...s, audienceDefault: value }))
    saveToLocalStorage('ci_setting_audience', value)
    flashSaved()
  }

  function updateHistory(enabled: boolean) {
    setSettings((s) => ({ ...s, conversationHistory: enabled }))
    saveToLocalStorage('ci_setting_history', enabled ? 'true' : 'false')
    flashSaved()
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function saveBYOKey() {
    if (!byoKeyInput.trim()) return
    setByoKeyBusy(true)
    setByoKeyMsg(null)
    try {
      const token = localStorage.getItem('chatislam_token') ?? ''
      const res   = await fetch('/api/settings/byo-key', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ api_key: byoKeyInput.trim() }),
      })
      if (res.ok) {
        setByoKeyMsg('API key saved.')
        setByoKeyInput('')
        setSettings((s) => ({ ...s, byoKeySet: true }))
        saveToLocalStorage('ci_setting_byo_key_set', 'true')
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string }
        setByoKeyMsg(err.error ?? 'Failed to save key.')
      }
    } catch {
      setByoKeyMsg('Network error. Please try again.')
    } finally {
      setByoKeyBusy(false)
    }
  }

  async function removeBYOKey() {
    setByoKeyBusy(true)
    setByoKeyMsg(null)
    try {
      const token = localStorage.getItem('chatislam_token') ?? ''
      const res   = await fetch('/api/settings/byo-key', {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setByoKeyMsg('API key removed.')
        setSettings((s) => ({ ...s, byoKeySet: false }))
        saveToLocalStorage('ci_setting_byo_key_set', 'false')
      } else {
        setByoKeyMsg('Failed to remove key.')
      }
    } catch {
      setByoKeyMsg('Network error. Please try again.')
    } finally {
      setByoKeyBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Saved indicator */}
      {saved && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        >
          Settings saved.
        </p>
      )}

      {/* ── Madhhab preference ── */}
      <section aria-labelledby="madhhab-heading">
        <h2 id="madhhab-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Madhhab preference
        </h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Preferred legal school for fiqh questions. The AI will present this school&apos;s position first.
        </p>
        <fieldset>
          <legend className="sr-only">Select madhhab preference</legend>
          <div className="space-y-2">
            {MADHAB_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <input
                  type="radio"
                  name="madhhab"
                  value={opt.value}
                  checked={settings.madhhab === opt.value}
                  onChange={() => updateMadhhab(opt.value)}
                  aria-label={`Madhhab preference: ${opt.label}`}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* ── Default audience mode ── */}
      <section aria-labelledby="audience-heading">
        <h2 id="audience-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Default conversation mode
        </h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          ChatIslam adapts its tone and explanations to who is asking.
        </p>
        <fieldset>
          <legend className="sr-only">Select default conversation mode</legend>
          <div className="space-y-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <input
                  type="radio"
                  name="audience"
                  value={opt.value}
                  checked={settings.audienceDefault === opt.value}
                  onChange={() => updateAudience(opt.value)}
                  aria-label={`Conversation mode: ${opt.label} — ${opt.description}`}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* ── Conversation history ── */}
      {FF_HISTORY && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Conversation history
          </h2>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Save your chat sessions so you can return to them later.
            Requires sign-in. History is stored on our servers.
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={settings.conversationHistory}
              onChange={(e) => updateHistory(e.target.checked)}
              aria-label="Enable conversation history"
              aria-describedby="history-desc"
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span id="history-desc" className="text-sm text-gray-800 dark:text-gray-200">
              Enable conversation history
            </span>
          </label>
        </section>
      )}

      {/* ── BYO API key ── */}
      <section aria-labelledby="byo-key-heading">
        <h2 id="byo-key-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Bring your own Anthropic API key
        </h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Use your own Anthropic API key to bypass the daily token limit.
          Your key is encrypted with AES-256 before storage and never logged.
          Requires sign-in.
        </p>
        {settings.byoKeySet ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-700 dark:text-emerald-400">API key stored.</span>
            <button
              type="button"
              onClick={removeBYOKey}
              disabled={byoKeyBusy}
              aria-label="Remove stored Anthropic API key"
              className="text-sm text-red-600 underline hover:no-underline disabled:opacity-50 dark:text-red-400"
            >
              Remove key
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <label htmlFor="byo-key-input" className="sr-only">Anthropic API key</label>
            <input
              id="byo-key-input"
              type="password"
              value={byoKeyInput}
              onChange={(e) => setByoKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
              aria-label="Anthropic API key (sk-ant- prefix)"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={saveBYOKey}
              disabled={byoKeyBusy || !byoKeyInput.trim()}
              aria-label="Save Anthropic API key"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {byoKeyBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
        {byoKeyMsg && (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-xs text-gray-600 dark:text-gray-400"
          >
            {byoKeyMsg}
          </p>
        )}
      </section>

      {/* ── Account ── */}
      <section aria-labelledby="account-heading">
        <h2 id="account-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Account
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/auth/signin"
            aria-label="Sign in to ChatIslam"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Sign in
          </a>
          <a
            href="/auth/signup"
            aria-label="Create a ChatIslam account"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Create account
          </a>
        </div>
      </section>
    </div>
  )
}
