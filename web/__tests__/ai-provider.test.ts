/**
 * ai-provider.test.ts — Track A6 scaffolding tests
 *
 * Tests the provider abstraction layer + NselfAIProvider stub behaviour.
 * When A6-03 ships the real nself-ai SDK, update NselfAIProvider tests to
 * mock the @nself/ai client instead of testing the stub throw.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AnthropicDirectProvider,
  NselfAIProvider,
  NselfAINotReadyError,
  getAIProvider,
  resetAIProvider,
  type AIMessage,
  type AIChatOptions,
} from '../lib/ai-provider'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const MESSAGES: AIMessage[] = [{ role: 'user', content: 'Assalamu alaykum' }]
const OPTS: AIChatOptions = { maxTokens: 100 }

// ─── NselfAIProvider stub ─────────────────────────────────────────────────────

describe('NselfAIProvider (Track A6 stub)', () => {
  it('has name nself_ai', () => {
    const p = new NselfAIProvider()
    expect(p.name).toBe('nself_ai')
  })

  it('exposes config snapshot from env vars', () => {
    vi.stubEnv('NSELF_AI_API_KEY', 'test-key-123')
    vi.stubEnv('NSELF_AI_BASE_URL', 'http://localhost:9999')
    vi.stubEnv('NSELF_AI_MODEL_POOL', 'local,anthropic')
    vi.stubEnv('NSELF_AI_FALLBACK_TO_DIRECT', 'false')

    const p = new NselfAIProvider()
    expect(p.config.apiKey).toBe('test-key-123')
    expect(p.config.baseURL).toBe('http://localhost:9999')
    expect(p.config.modelPool).toEqual(['local', 'anthropic'])
    expect(p.config.fallbackDirect).toBe(false)

    vi.unstubAllEnvs()
  })

  it('uses default model pool when env var absent', () => {
    const p = new NselfAIProvider()
    expect(p.config.modelPool).toEqual(['local', 'anthropic'])
  })

  it('throws NselfAINotReadyError from chat()', async () => {
    const p = new NselfAIProvider()
    await expect(p.chat(MESSAGES, OPTS)).rejects.toThrow(NselfAINotReadyError)
  })

  it('NselfAINotReadyError has correct code and trackTicket', async () => {
    const p = new NselfAIProvider()
    const err = await p.chat(MESSAGES, OPTS).catch((e) => e)
    expect(err).toBeInstanceOf(NselfAINotReadyError)
    expect(err.code).toBe('NSELF_AI_NOT_READY')
    expect(err.trackTicket).toBe('A6-03')
  })

  it('NselfAINotReadyError message references the spec doc', async () => {
    const p = new NselfAIProvider()
    const err = await p.chat(MESSAGES, OPTS).catch((e) => e)
    expect(err.message).toMatch(/nself-ai-sdk-interface\.md/)
  })
})

// ─── Factory — anthropic_direct (default) ─────────────────────────────────────

describe('getAIProvider — anthropic_direct', () => {
  beforeEach(() => {
    resetAIProvider()
    vi.resetModules()
  })

  afterEach(() => {
    resetAIProvider()
    vi.unstubAllEnvs()
  })

  it('returns AnthropicDirectProvider when AI_PROVIDER=anthropic_direct', () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic_direct')
    const p = getAIProvider()
    expect(p.name).toBe('anthropic_direct')
    expect(p).toBeInstanceOf(AnthropicDirectProvider)
  })

  it('defaults to anthropic_direct when AI_PROVIDER is unset', () => {
    vi.stubEnv('AI_PROVIDER', '')
    const p = getAIProvider()
    expect(p.name).toBe('anthropic_direct')
  })

  it('logs warning and falls back for unknown AI_PROVIDER value', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('AI_PROVIDER', 'unknown_provider')
    const p = getAIProvider()
    expect(p.name).toBe('anthropic_direct')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown AI_PROVIDER'),
    )
    warnSpy.mockRestore()
  })

  it('caches provider singleton across calls', () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic_direct')
    const p1 = getAIProvider()
    const p2 = getAIProvider()
    expect(p1).toBe(p2)
  })

  it('resetAIProvider clears singleton', () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic_direct')
    const p1 = getAIProvider()
    resetAIProvider()
    const p2 = getAIProvider()
    expect(p1).not.toBe(p2)
  })
})

// ─── Factory — nself_ai without fallback ─────────────────────────────────────

describe('getAIProvider — nself_ai (stub, no fallback)', () => {
  beforeEach(() => {
    resetAIProvider()
    vi.stubEnv('AI_PROVIDER', 'nself_ai')
    vi.stubEnv('NSELF_AI_FALLBACK_TO_DIRECT', 'false')
  })

  afterEach(() => {
    resetAIProvider()
    vi.unstubAllEnvs()
  })

  it('returns provider with name nself_ai', () => {
    const p = getAIProvider()
    expect(p.name).toBe('nself_ai')
  })

  it('chat() throws NselfAINotReadyError (no fallback)', async () => {
    const p = getAIProvider()
    await expect(p.chat(MESSAGES)).rejects.toThrow(NselfAINotReadyError)
  })
})

// ─── Factory — nself_ai WITH fallback ────────────────────────────────────────

describe('getAIProvider — nself_ai with NSELF_AI_FALLBACK_TO_DIRECT=true', () => {
  beforeEach(() => {
    resetAIProvider()
    vi.stubEnv('AI_PROVIDER', 'nself_ai')
    vi.stubEnv('NSELF_AI_FALLBACK_TO_DIRECT', 'true')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
  })

  afterEach(() => {
    resetAIProvider()
    vi.unstubAllEnvs()
  })

  it('returns a provider with name nself_ai_with_fallback', () => {
    const p = getAIProvider()
    expect(p.name).toBe('nself_ai_with_fallback')
  })

  it('falls back to anthropic_direct and warns when stub throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Mock the direct provider so we don't actually call Anthropic
    const mockResult = {
      content: 'Wa alaykum assalam',
      inputTokens: 10,
      outputTokens: 5,
      cacheHit: false,
      modelId: 'claude-sonnet-4-6',
    }
    vi.spyOn(AnthropicDirectProvider.prototype, 'chat').mockResolvedValue(mockResult)

    const p = getAIProvider()
    const result = await p.chat(MESSAGES, OPTS)

    expect(result).toEqual(mockResult)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('nself-ai not ready'),
    )
    warnSpy.mockRestore()
  })
})
