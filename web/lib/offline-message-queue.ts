/**
 * FILE:    chatislam/web/lib/offline-message-queue.ts
 * PURPOSE: IndexedDB offline queue for composed chat messages.
 *   When the user sends a message while offline, it is stored in IndexedDB.
 *   When connectivity is restored (online event), drainQueue() replays all
 *   queued messages through the /api/chat endpoint.
 *
 * WHY IndexedDB over localStorage:
 *   - localStorage is synchronous, size-capped (~5 MB shared), and unavailable
 *     in service workers. IndexedDB is async, per-origin, and survives SW context.
 *   - Queued messages can include full conversation history; IDB handles larger payloads.
 *
 * Constraints:
 *   - Browser-only. Never import this module from server-side code.
 *   - No external dependencies — plain IndexedDB API.
 *   - Designed for a single writer (the chat page) + single drainer (online listener).
 *
 * Inputs (enqueue):
 *   - item: QueuedMessage — {id, conversationId, history, message, audienceMode, queuedAt}
 *
 * Outputs (drain):
 *   - DrainResult[] — one per queued item, with success/failure + server response
 *
 * SPORT: P2-E5-W01-S01-T01 — AC-06 offline queue (chatislam/web)
 * Ref: .claude/docs/p2-robustness-framework-spec.md §4
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueuedMessage {
  /** Unique ID for this queued item (generated at enqueue time) */
  id:             string
  conversationId: string | null
  history:        Array<{ role: 'user' | 'assistant'; content: string }>
  message:        string
  audienceMode:   'dawah' | 'qa' | 'tutoring'
  /** ISO timestamp when this item was queued */
  queuedAt:       string
}

export interface DrainResult {
  id:       string
  success:  boolean
  /** HTTP status from /api/chat (undefined if fetch threw) */
  status?:  number
  error?:   string
}

// ---------------------------------------------------------------------------
// IndexedDB setup
// ---------------------------------------------------------------------------

const DB_NAME     = 'chatislam-offline'
const DB_VERSION  = 1
const STORE_NAME  = 'message-queue'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (evt) => {
      const db    = (evt.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // keyPath = id; ordered by queuedAt for FIFO drain
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('queuedAt', 'queuedAt', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(new Error(`[offline-queue] IDB open failed: ${req.error?.message}`))
  })
}

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

/**
 * enqueueMessage — store a composed message in IndexedDB for later replay.
 * Call this when a fetch to /api/chat fails due to network offline.
 */
export async function enqueueMessage(item: QueuedMessage): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.add(item)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(new Error(`[offline-queue] enqueue failed: ${req.error?.message}`))
  })
}

// ---------------------------------------------------------------------------
// Count (for UI badge)
// ---------------------------------------------------------------------------

/**
 * getQueueCount — how many messages are pending replay.
 * Use this to show a "X messages queued" indicator in the UI.
 */
export async function getQueueCount(): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(new Error(`[offline-queue] count failed: ${req.error?.message}`))
  })
}

// ---------------------------------------------------------------------------
// Drain
// ---------------------------------------------------------------------------

/**
 * drainQueue — replay all queued messages through /api/chat.
 * Called automatically on the 'online' event (see installOnlineListener).
 * Returns a DrainResult per item; partial failure is OK — failed items remain.
 *
 * Ordering: FIFO by queuedAt.
 */
export async function drainQueue(): Promise<DrainResult[]> {
  const db    = await openDb()
  const items = await getAllQueued(db)

  const results: DrainResult[] = []

  for (const item of items) {
    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          conversationId: item.conversationId,
          history:        item.history,
          message:        item.message,
          audienceMode:   item.audienceMode,
          _offlineReplay: true,  // flag so server can log separately
        }),
      })

      if (res.ok || res.status === 429) {
        // 429 = rate-limited — still remove from queue (user will see in UI)
        await removeQueued(db, item.id)
        results.push({ id: item.id, success: res.ok, status: res.status })
      } else {
        // Non-OK, non-429 — leave in queue for next drain attempt
        results.push({ id: item.id, success: false, status: res.status })
      }
    } catch (err) {
      // Still offline or network error — stop draining, leave remaining items
      results.push({
        id:      item.id,
        success: false,
        error:   err instanceof Error ? err.message : String(err),
      })
      break
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getAllQueued(db: IDBDatabase): Promise<QueuedMessage[]> {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('queuedAt')
    const req   = index.getAll()
    req.onsuccess = () => resolve(req.result as QueuedMessage[])
    req.onerror   = () => reject(new Error(`[offline-queue] getAll failed: ${req.error?.message}`))
  })
}

function removeQueued(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(new Error(`[offline-queue] delete failed: ${req.error?.message}`))
  })
}

// ---------------------------------------------------------------------------
// Online listener (install once at app startup)
// ---------------------------------------------------------------------------

let _listenerInstalled = false

/**
 * installOnlineListener — call once in the chat layout or ClientProviders.
 * Drains the queue automatically when the browser comes back online.
 * Safe to call multiple times — installs the listener only once.
 */
export function installOnlineListener(
  onDrain?: (results: DrainResult[]) => void
): void {
  if (typeof window === 'undefined') return
  if (_listenerInstalled) return
  _listenerInstalled = true

  window.addEventListener('online', async () => {
    console.info('[offline-queue] Online — draining message queue')
    try {
      const results = await drainQueue()
      if (results.length > 0) {
        console.info('[offline-queue] Drain complete', results)
        onDrain?.(results)
      }
    } catch (err) {
      console.error('[offline-queue] Drain failed', err)
    }
  })
}

/** Reset listener state (tests only). */
export function _resetOnlineListener(): void {
  _listenerInstalled = false
}
