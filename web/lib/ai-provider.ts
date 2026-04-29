/**
 * ChatIslam — AI Provider Abstraction (SCI-22)
 *
 * Interface that decouples the AI call site from the underlying model provider.
 * P3: AnthropicDirectProvider is the only implementation (D-P3-44).
 * Track A6: NselfAIProvider stub will be filled when nSelf ships SDK integration.
 *
 * Select provider via AI_PROVIDER env var (default: anthropic_direct).
 */

import Anthropic from '@anthropic-ai/sdk'

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
 * PCI filed to nSelf for Track A6 status:
 * ~/Sites/nself/.claude/inbox/msg-2026-04-27-nself-ai-sdk-integration.md
 *
 * This stub exists so the factory compiles and the migration path is clear.
 * Replace the throw() with the nself-ai SDK call when available.
 */
export class NselfAIProvider implements AIProvider {
  readonly name = 'nself_ai'

  async chat(_messages: AIMessage[], _opts?: AIChatOptions): Promise<AIChatResult> {
    throw new Error(
      'NselfAIProvider is not implemented in P3. ' +
      'Migration deferred to Track A6 (D-P3-44). ' +
      'PCI filed: msg-2026-04-27-nself-ai-sdk-integration.md',
    )
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
    case 'nself_ai':
      _provider = new NselfAIProvider()
      break
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
