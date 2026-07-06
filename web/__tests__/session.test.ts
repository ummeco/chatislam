import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildSession,
  computeInitials,
  getSession,
  saveSession,
  clearSession,
  hasValidToken,
  type ChatIslamSession,
} from '../src/lib/session'

// ---------------------------------------------------------------------------
// localStorage mock (matches praycalc/web's session.test.ts house style).
// chatislam/web's vitest.config.ts uses environment: 'node' (not jsdom), so
// `window` is not declared at all here — session.ts guards every function
// with `typeof window === 'undefined'` to stay SSR-safe, which means the
// guard short-circuits in a bare Node environment too. Stub a minimal
// `window` global (any truthy value satisfies `typeof window !== 'undefined'`)
// so the module under test exercises its localStorage branch.
// ---------------------------------------------------------------------------
let _store: Record<string, string> = {}

Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => _store[key] ?? null,
    setItem: (key: string, value: string) => {
      _store[key] = value
    },
    removeItem: (key: string) => {
      delete _store[key]
    },
    clear: () => {
      _store = {}
    },
  },
  writable: true,
  configurable: true,
})

const SESSION_KEY = 'chatislam-profile'

beforeEach(() => {
  _store = {}
})

describe('computeInitials', () => {
  it('derives initials from first+last name', () => {
    expect(computeInitials('John Doe')).toBe('JD')
  })

  it('derives initials from a single name (first two letters)', () => {
    expect(computeInitials('Madonna')).toBe('MA')
  })
})

describe('buildSession', () => {
  it('builds a session without a token expiry', () => {
    const s = buildSession('john.doe@example.com')
    expect(s.email).toBe('john.doe@example.com')
    expect(s.displayName).toBe('john doe')
    expect(s.accessTokenExpiresAt).toBeUndefined()
  })

  it('accepts an explicit display name', () => {
    const s = buildSession('a@b.com', 'A B')
    expect(s.displayName).toBe('A B')
    expect(s.initials).toBe('AB')
  })
})

describe('getSession / saveSession / clearSession', () => {
  it('returns null when nothing is stored', () => {
    expect(getSession()).toBeNull()
  })

  it('round-trips a profile session (with expiry) through localStorage', () => {
    const s: ChatIslamSession = {
      email: 'a@b.com',
      displayName: 'A B',
      initials: 'AB',
      accessTokenExpiresAt: Date.now() + 900_000,
    }
    saveSession(s)
    expect(getSession()).toEqual(s)
  })

  it('clearSession removes the stored session', () => {
    saveSession(buildSession('x@y.com'))
    clearSession()
    expect(getSession()).toBeNull()
  })

  it('getSession returns null on malformed JSON', () => {
    _store[SESSION_KEY] = 'not-json{{'
    expect(getSession()).toBeNull()
  })
})

describe('hasValidToken', () => {
  it('returns false for null session', () => {
    expect(hasValidToken(null)).toBe(false)
  })

  it('returns false for a session with no expiry field', () => {
    const s = buildSession('a@b.com')
    expect(hasValidToken(s)).toBe(false)
  })

  it('returns false when accessTokenExpiresAt is in the past', () => {
    const s: ChatIslamSession = {
      ...buildSession('a@b.com'),
      accessTokenExpiresAt: Date.now() - 1000,
    }
    expect(hasValidToken(s)).toBe(false)
  })

  it('returns true when accessTokenExpiresAt is in the future', () => {
    const s: ChatIslamSession = {
      ...buildSession('a@b.com'),
      accessTokenExpiresAt: Date.now() + 900_000,
    }
    expect(hasValidToken(s)).toBe(true)
  })
})
