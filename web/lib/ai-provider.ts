/**
 * ChatIslam — AI Provider Abstraction (SCI-22)
 *
 * Interface that decouples the AI call site from the underlying model provider.
 * P3: AnthropicDirectProvider is the only implementation (D-P3-44).
 * Track A6: NselfAIProvider stub will be filled when nSelf ships SDK integration.
 *
 * P4 additions (CB-08 T47):
 *   - Stream interruption recovery via AbortController + 30s inactivity timeout
 *   - Partial content stored in Redis: ci:partial:{session_id}:{message_id} TTL 300s
 *   - Resume protocol: client sends { session_id, resume: true, partial_content_hash }
 *   - Max 3 resume attempts (STREAM_MAX_RESUME_ATTEMPTS env var)
 *   - Hash verified server-side — never trust client-sent partial content
 *
 * Select provider via AI_PROVIDER env var (default: anthropic_direct).
 */

import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

// ─── Stream interruption types (P4 CB-08) ─────────────────────────────────────

export interface StreamResumeOpts {
  session_id:           string
  message_id:           string
  partial_content_hash: string  // sha256 of partial content — verified server-side
}

export interface StreamChunk {
  type:    'text_delta' | 'error' | 'final'
  content: string
  /** Only on 'final' */
  progress_delta?:     string
  mastery_score_delta?: number
  next_lesson_hint?:   string
}

export type StreamInterruptState =
  | { interrupted: false }
  | { interrupted: true; error: 'partial_expired' | 'hash_mismatch' | 'max_attempts' }

// Redis helper for partial storage
interface RedisStreamLike {
  get(key: string): Promise<string | null>
  setex(key: string, seconds: number, value: string): Promise<unknown>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  del(key: string): Promise<number>
}

let _streamRedis: RedisStreamLike | null = null

function getStreamRedis(): RedisStreamLike | null {
  if (_streamRedis) return _streamRedis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    const { Redis } = require('ioredis') as { Redis: new (url: string) => RedisStreamLike }
    _streamRedis = new Redis(url)
    return _streamRedis
  } catch {
    return null
  }
}

function getPartialTtl(): number {
  return Number(process.env.STREAM_PARTIAL_TTL_SECONDS ?? '300')
}

function getMaxResumeAttempts(): number {
  return Number(process.env.STREAM_MAX_RESUME_ATTEMPTS ?? '3')
}

function partialKey(sessionId: string, messageId: string): string {
  return `ci:partial:${sessionId}:${messageId}`
}

function partialAttemptsKey(sessionId: string, messageId: string): string {
  return `ci:partial:attempts:${sessionId}:${messageId}`
}

/**
 * Store partial content for stream resume.
 * Key: ci:partial:{session_id}:{message_id}
 * TTL: STREAM_PARTIAL_TTL_SECONDS (default 300s)
 */
export async function storePartialContent(
  sessionId:  string,
  messageId:  string,
  partial:    string,
): Promise<void> {
  const redis = getStreamRedis()
  if (!redis) return
  try {
    const hash = crypto.createHash('sha256').update(partial).digest('hex')
    const data = JSON.stringify({ content: partial, hash })
    await redis.setex(partialKey(sessionId, messageId), getPartialTtl(), data)
  } catch { /* non-blocking */ }
}

/**
 * Verify partial content hash and return the stored partial.
 * Returns null if expired, hash mismatches, or max attempts exceeded.
 */
export async function verifyAndRetrievePartial(
  sessionId:  string,
  messageId:  string,
  clientHash: string,
): Promise<{ content: string } | StreamInterruptState> {
  const redis = getStreamRedis()
  if (!redis) return { interrupted: true, error: 'partial_expired' }

  const maxAttempts = getMaxResumeAttempts()

  try {
    // Check attempt count
    const attKey  = partialAttemptsKey(sessionId, messageId)
    const attempts = await redis.incr(attKey)
    if (attempts === 1) await redis.expire(attKey, getPartialTtl())

    if (attempts > maxAttempts) {
      return { interrupted: true, error: 'max_attempts' }
    }

    // Retrieve stored partial
    const stored = await redis.get(partialKey(sessionId, messageId))
    if (!stored) return { interrupted: true, error: 'partial_expired' }

    const { content, hash } = JSON.parse(stored) as { content: string; hash: string }

    // Verify hash (server-side — never trust client-sent partial content directly)
    if (hash !== clientHash) {
      return { interrupted: true, error: 'hash_mismatch' }
    }

    return { content }
  } catch {
    return { interrupted: true, error: 'partial_expired' }
  }
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface AIMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface AIChatOptions {
  model?:     string
  maxTokens?: number
  system?:    string
  apiKey?:    string  // BYO key override
}

export interface AIChatResult {
  content:      string
  inputTokens:  number
  outputTokens: number
  cacheHit:     boolean
  modelId:      string
}

export interface AIProvider {
  chat(messages: AIMessage[], opts?: AIChatOptions): Promise<AIChatResult>
  readonly name: string
}

// ─── Anthropic Direct Provider ────────────────────────────────────────────────

export class AnthropicDirectProvider implements AIProvider {
  readonly name = 'anthropic_direct'

  private getClient(apiKey?: string): Anthropic {
    return new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })
  }

  /**
   * Streaming chat with interruption detection (CB-08 T47).
   *
   * On 30s inactivity: aborts stream, stores partial in Redis, returns INTERRUPTED event.
   * Client can resume by sending resume: true + partial_content_hash.
   */
  async chatStream(
    messages:    AIMessage[],
    opts:        AIChatOptions & { session_id?: string; message_id?: string } = {},
  ): Promise<ReadableStream<string>> {
    const client    = this.getClient(opts.apiKey)
    const modelId   = opts.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'
    const maxTokens = opts.maxTokens ?? 2048

    const systemBlocks: Anthropic.TextBlockParam[] = opts.system
      ? [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }]
      : []

    const inactivityTimeoutMs = 30_000
    let partialContent = ''

    const stream = await client.messages.stream({
      model:      modelId,
      max_tokens: maxTokens,
      system:     systemBlocks.length > 0 ? systemBlocks : undefined,
      messages:   messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const sessionId  = opts.session_id
    const messageId  = opts.message_id ?? crypto.randomUUID()

    return new ReadableStream<string>({
      async start(controller) {
        let inactivityTimer: ReturnType<typeof setTimeout> | null = null

        function resetTimer() {
          if (inactivityTimer) clearTimeout(inactivityTimer)
          inactivityTimer = setTimeout(async () => {
            // Store partial and emit INTERRUPTED
            if (sessionId) {
              await storePartialContent(sessionId, messageId, partialContent)
            }
            controller.enqueue(
              JSON.stringify({ type: 'interrupted', partial: partialContent, message_id: messageId }),
            )
            controller.close()
            stream.controller.abort()
          }, inactivityTimeoutMs)
        }

        resetTimer()

        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text
              partialContent += text
              resetTimer()
              controller.enqueue(JSON.stringify({ type: 'text_delta', content: text }))
            }
          }

          if (inactivityTimer) clearTimeout(inactivityTimer)
          controller.enqueue(JSON.stringify({ type: 'final', content: '' }))
          controller.close()
        } catch (err) {
          if (inactivityTimer) clearTimeout(inactivityTimer)
          // If aborted by inactivity timer, stream is already closed above
          if (!controller.desiredSize !== undefined) {
            controller.error(err)
          }
        }
      },
    })
  }

  async chat(messages: AIMessage[], opts: AIChatOptions = {}): Promise<AIChatResult> {
    const client    = this.getClient(opts.apiKey)
    const modelId   = opts.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
    const maxTokens = opts.maxTokens ?? 2048

    const systemBlocks: Anthropic.TextBlockParam[] = opts.system
      ? [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }]
      : []

    const response = await client.messages.create({
      model:      modelId,
      max_tokens: maxTokens,
      system:     systemBlocks.length > 0 ? systemBlocks : undefined,
      messages:   messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const usageExt = response.usage as unknown as Record<string, unknown>
    const cacheHit = usageExt['cache_read_input_tokens']
      ? Number(usageExt['cache_read_input_tokens']) > 0
      : false

    return {
      content,
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheHit,
      modelId,
    }
  }
}

// ─── nSelf AI Provider stub (Track A6) ────────────────────────────────────────

/**
 * NselfAINotReadyError — thrown by NselfAIProvider until nself-ai SDK ships.
 *
 * Callers can catch specifically to trigger graceful degradation:
 *   catch (err) { if (err instanceof NselfAINotReadyError) fallback() }
 */
export class NselfAINotReadyError extends Error {
  readonly code = 'NSELF_AI_NOT_READY' as const
  /** Track A6 ticket that will replace this stub */
  readonly trackTicket = 'A6-03' as const

  constructor() {
    super(
      'NselfAIProvider is not implemented in P3 (D-P3-44). ' +
      'Migration deferred to Track A6. ' +
      'PCI filed: msg-2026-04-27-nself-ai-sdk-integration.md. ' +
      'Expected interface: chatislam/.github/docs/nself-ai-sdk-interface.md',
    )
    this.name = 'NselfAINotReadyError'
  }
}

/**
 * NselfAIProvider — stub for Track A6 nself-ai SDK migration.
 *
 * PCI filed to nSelf: ~/Sites/nself/.claude/inbox/msg-2026-04-27-nself-ai-sdk-integration.md
 * Integration spec:   chatislam/.github/docs/nself-ai-sdk-interface.md
 *
 * A6-03 will replace this stub with the real @nself/ai SDK call.
 * A6-04 will move rate-limit config into nself-ai plugin layer.
 * A6-05 will evaluate prompt-injection defense handoff to plugin layer.
 *
 * Expected nself-ai client config (from env vars — see .env.example):
 *   NSELF_AI_API_KEY            — plugin API key (replaces ANTHROPIC_API_KEY)
 *   NSELF_AI_BASE_URL           — optional gateway override (local dev)
 *   NSELF_AI_MODEL_POOL         — comma-list: "local,anthropic" (default)
 *   NSELF_AI_FALLBACK_TO_DIRECT — "true" to fall back to anthropic_direct on error
 */
export class NselfAIProvider implements AIProvider {
  readonly name = 'nself_ai'

  /** Config snapshot — populated from env at instantiation so tests can inspect. */
  readonly config = {
    apiKey:        process.env.NSELF_AI_API_KEY,
    baseURL:       process.env.NSELF_AI_BASE_URL,
    modelPool:     (process.env.NSELF_AI_MODEL_POOL ?? 'local,anthropic').split(','),
    fallbackDirect: process.env.NSELF_AI_FALLBACK_TO_DIRECT === 'true',
  }

  async chat(_messages: AIMessage[], _opts?: AIChatOptions): Promise<AIChatResult> {
    // A6-03: replace this body with `@nself/ai` SDK call.
    // Shape reference: chatislam/.github/docs/nself-ai-sdk-interface.md
    //
    // When fallbackDirect is true, callers should catch NselfAINotReadyError
    // and retry via AnthropicDirectProvider. The factory handles this (see below).
    throw new NselfAINotReadyError()
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (_provider) return _provider

  const name = process.env.AI_PROVIDER ?? 'anthropic_direct'

  switch (name) {
    case 'anthropic_direct':
      _provider = new AnthropicDirectProvider()
      break
    case 'nself_ai': {
      const nselfProvider = new NselfAIProvider()
      if (nselfProvider.config.fallbackDirect) {
        // Wrap with fallback: if nself-ai is not ready, silently degrade to direct.
        // Remove this wrapper once A6-03 ships the real SDK call.
        const direct = new AnthropicDirectProvider()
        _provider = {
          name: 'nself_ai_with_fallback',
          async chat(messages, opts) {
            try {
              return await nselfProvider.chat(messages, opts)
            } catch (err) {
              if (err instanceof NselfAINotReadyError) {
                console.warn('[ai-provider] nself-ai not ready (A6-03 pending); using anthropic_direct fallback')
                return direct.chat(messages, opts)
              }
              throw err
            }
          },
        }
      } else {
        _provider = nselfProvider
      }
      break
    }
    default:
      console.warn(`[ai-provider] Unknown AI_PROVIDER "${name}", falling back to anthropic_direct`)
      _provider = new AnthropicDirectProvider()
  }

  return _provider
}

/** Reset for tests */
export function resetAIProvider(): void {
  _provider = null
}
