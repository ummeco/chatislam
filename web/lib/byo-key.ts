/**
 * ChatIslam — BYO Anthropic Key: Encrypted Storage (SCI-18)
 *
 * Interim implementation: AES-256-GCM encryption using BYO_KEY_ENCRYPTION_SECRET.
 * D-P3-26: nSelf vault primitive is preferred — file PCI when available.
 * Until nSelf ships the vault primitive, this AES-256-GCM impl is the interim.
 *
 * Key lifecycle:
 *   1. User submits key via settings UI → validateAndStore()
 *   2. validateAndStore() calls Anthropic to verify (list models — lightweight)
 *   3. On success: encrypt key, upsert to ci_byo_api_keys
 *   4. On use: getChatAPIKey() decrypts and returns raw key string
 *
 * Never logs or persists the plaintext key.
 */

import crypto from 'crypto'

// ─── Encryption (AES-256-GCM) ───────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96-bit IV — recommended for GCM
const TAG_LENGTH = 16  // 128-bit auth tag

/**
 * Derive a 32-byte key from BYO_KEY_ENCRYPTION_SECRET via SHA-256.
 * The env var should be 64 hex chars (32 bytes) or any high-entropy string.
 */
function getDerivedKey(): Buffer {
  const secret = process.env.BYO_KEY_ENCRYPTION_SECRET
  if (!secret) throw new Error('BYO_KEY_ENCRYPTION_SECRET is not set')
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypt a plaintext API key.
 * Returns a base64url-encoded string: IV (12 bytes) || TAG (16 bytes) || CIPHERTEXT
 */
export function encryptApiKey(plaintext: string): string {
  const key = getDerivedKey()
  const iv  = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  const combined = Buffer.concat([iv, tag, encrypted])
  return combined.toString('base64url')
}

/**
 * Decrypt an API key encrypted by encryptApiKey().
 * Returns the plaintext key string, or throws on tamper/corruption.
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getDerivedKey()
  const buf = Buffer.from(ciphertext, 'base64url')

  if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext: too short')
  }

  const iv        = buf.subarray(0, IV_LENGTH)
  const tag       = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/**
 * Extract the key hint (last 4 characters of the raw API key).
 * Displayed in the UI so the user can identify which key is stored.
 */
export function extractKeyHint(plaintextKey: string): string {
  return plaintextKey.slice(-4)
}

// ─── Hasura helpers ─────────────────────────────────────────────────────────

const HASURA_ENDPOINT     = process.env.HASURA_ENDPOINT     ?? 'https://api.ummat.dev/v1/graphql'
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET ?? ''

async function hasuraAdmin<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(HASURA_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Hasura error: ${res.status}`)
  const json = (await res.json()) as { data?: T; errors?: unknown[] }
  if (json.errors?.length) throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`)
  return json.data as T
}

// ─── Validate + store ────────────────────────────────────────────────────────

/**
 * Validate the key against Anthropic, then store encrypted in ci_byo_api_keys.
 * Throws on invalid key (Anthropic 401) or missing encryption secret.
 */
export async function setChatAPIKey(userId: string, rawKey: string): Promise<void> {
  // 1. Validate against Anthropic (lightweight — just list models)
  const testRes = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': rawKey,
      'anthropic-version': '2023-06-01',
    },
  })

  if (testRes.status === 401) {
    throw new Error('byo_key_invalid')
  }
  if (!testRes.ok) {
    throw new Error(`Anthropic validation failed: ${testRes.status}`)
  }

  // 2. Encrypt
  const encryptedKey = encryptApiKey(rawKey)
  const keyHint      = extractKeyHint(rawKey)

  // 3. Upsert to ci_byo_api_keys
  await hasuraAdmin<unknown>(`
    mutation UpsertByoKey($userId: uuid!, $encryptedKey: String!, $keyHint: String!) {
      insert_ci_byo_api_keys_one(
        object: {
          user_id:       $userId,
          provider:      "anthropic",
          encrypted_key: $encryptedKey,
          key_hint:      $keyHint,
          last_used_at:  null,
        },
        on_conflict: {
          constraint:         ci_byo_api_keys_user_id_provider_key,
          update_columns:     [encrypted_key, key_hint, created_at],
        }
      ) { id }
    }
  `, { userId, encryptedKey, keyHint })
}

// ─── Retrieve ─────────────────────────────────────────────────────────────────

interface BYOKeyRow {
  id:            string
  encrypted_key: string
  key_hint:      string
}

/**
 * Retrieve and decrypt the user's BYO API key.
 * Returns null if no key is stored.
 * Updates last_used_at on successful retrieval.
 */
export async function getBYOApiKey(userId: string): Promise<string | null> {
  const data = await hasuraAdmin<{ ci_byo_api_keys: BYOKeyRow[] }>(`
    query GetByoKey($userId: uuid!) {
      ci_byo_api_keys(
        where: { user_id: { _eq: $userId }, provider: { _eq: "anthropic" } }
        limit: 1
      ) {
        id
        encrypted_key
        key_hint
      }
    }
  `, { userId })

  const row = data.ci_byo_api_keys[0]
  if (!row) return null

  // Update last_used_at (fire-and-forget)
  void hasuraAdmin<unknown>(`
    mutation UpdateByoKeyLastUsed($id: uuid!) {
      update_ci_byo_api_keys_by_pk(
        pk_columns: { id: $id },
        _set: { last_used_at: "now()" }
      ) { id }
    }
  `, { id: row.id })

  return decryptApiKey(row.encrypted_key)
}
