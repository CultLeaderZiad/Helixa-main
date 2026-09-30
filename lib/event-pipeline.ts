import { createHash } from "crypto"
import { storyEventKey } from "@/lib/channel-ids"

/**
 * Inbound webhook queue.
 *
 * Meta and Telegram retry deliveries that do not get a fast 2xx. The webhook
 * stores each logical event once, keyed so a retry hits the unique index and
 * does not send another reply. A worker claims due rows, and a failure moves
 * `next_attempt_at` out with exponential backoff until the row is dead.
 *
 * The functions in this file are the rules the worker and the SQL functions
 * follow. Tests exercise them without a database.
 */

export type InboundPlatform = "instagram" | "facebook" | "whatsapp" | "telegram" | "tiktok" | "webchat"

export type QueueStatus = "pending" | "processing" | "done" | "dead"

export interface InboundPiece {
  platform: InboundPlatform
  idempotencyKey: string
  accountKey: string
  payload: unknown
}

export interface StoredEvent {
  idempotencyKey: string
  status: QueueStatus
  attempts: number
  nextAttemptAt: number
  lockedAt: number | null
  lastError: string | null
  accountKey: string
}

export interface RateBucket {
  windowStart: number
  count: number
}

export const DEFAULT_MAX_ATTEMPTS = 5
export const DEFAULT_BACKOFF_BASE_MS = 15_000
export const DEFAULT_BACKOFF_CAP_MS = 15 * 60_000
export const DEFAULT_LOCK_TIMEOUT_MS = 2 * 60_000
export const DEFAULT_RATE_LIMIT = 30
export const DEFAULT_RATE_WINDOW_MS = 60_000

export class RetryableInboundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RetryableInboundError"
  }
}

export function payloadHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex")
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
  return `{${entries.join(",")}}`
}

function isSystemMessagingEvent(event: any): boolean {
  return Boolean(event?.read || event?.delivery || event?.message?.is_echo)
}

function messagingId(event: any): string {
  const mid = event?.message?.mid || event?.postback?.mid || event?.reaction?.mid
  if (mid) return String(mid)
  const story = storyEventKey(event)
  if (story) return story
  return payloadHash(event)
}

function wholePiece(platform: InboundPlatform, body: unknown, accountKey: string): InboundPiece {
  return {
    platform,
    idempotencyKey: `${platform}:body:${payloadHash(body)}`,
    accountKey,
    payload: body,
  }
}

/**
 * Split one webhook delivery into logical events. The same Meta retry, or the
 * same message id delivered again, produces the same idempotency key.
 * Read/delivery/echo receipts are not events we reply to, so they are dropped.
 */
export function splitInboundEvents(
  platform: InboundPlatform,
  body: any,
  options?: { botId?: string },
): InboundPiece[] {
  if (platform === "telegram") {
    const bot = options?.botId || "unknown"
    const updateId = body?.update_id
    const idempotencyKey =
      updateId === null || updateId === undefined
        ? `telegram:${bot}:body:${payloadHash(body)}`
        : `telegram:${bot}:${updateId}`
    return [
      {
        platform,
        idempotencyKey,
        accountKey: `telegram:${bot}`,
        payload: body,
      },
    ]
  }

  if (platform === "tiktok") {
    const openId = body?.user_openid || "unknown"
    let content = body?.content
    if (typeof content === "string") {
      try {
        content = JSON.parse(content)
      } catch {
        content = null
      }
    }
    const id = content?.message_id || content?.comment_id || payloadHash(body)
    return [
      {
        platform,
        idempotencyKey: `tiktok:${body?.event || "event"}:${id}`,
        accountKey: `tiktok:${openId}`,
        payload: body,
      },
    ]
  }

  if (platform === "webchat") {
    const widget = body?.widget_id || "unknown"
    const id = body?.message_id || payloadHash(body)
    return [
      {
        platform,
        idempotencyKey: `webchat:${widget}:${id}`,
        accountKey: `webchat:${widget}`,
        payload: body,
      },
    ]
  }

  if (platform === "whatsapp") {
    const pieces: InboundPiece[] = []
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {}
        const phone = value?.metadata?.phone_number_id || entry?.id || "unknown"
        const accountKey = `whatsapp:${phone}`
        for (const message of value?.messages || []) {
          const id = message?.id ? String(message.id) : payloadHash(message)
          pieces.push({
            platform,
            idempotencyKey: `whatsapp:message:${id}`,
            accountKey,
            payload: {
              object: body?.object || "whatsapp_business_account",
              entry: [
                {
                  id: entry?.id,
                  changes: [
                    {
                      field: change?.field || "messages",
                      value: { ...value, messages: [message], statuses: undefined },
                    },
                  ],
                },
              ],
            },
          })
        }
        for (const status of value?.statuses || []) {
          const id = `${status?.id || "status"}:${status?.status || ""}:${status?.timestamp || payloadHash(status)}`
          pieces.push({
            platform,
            idempotencyKey: `whatsapp:status:${id}`,
            accountKey,
            payload: {
              object: body?.object || "whatsapp_business_account",
              entry: [
                {
                  id: entry?.id,
                  changes: [
                    {
                      field: "messages",
                      value: { metadata: value?.metadata, statuses: [status] },
                    },
                  ],
                },
              ],
            },
          })
        }
      }
    }
    return pieces.length > 0 ? pieces : [wholePiece(platform, body, "whatsapp:unknown")]
  }

  const pieces: InboundPiece[] = []
  for (const entry of body?.entry || []) {
    const accountKey = `${platform}:${entry?.id || "unknown"}`
    for (const event of entry?.messaging || []) {
      if (isSystemMessagingEvent(event)) continue
      pieces.push({
        platform,
        idempotencyKey: `${platform}:messaging:${messagingId(event)}`,
        accountKey,
        payload: {
          object: body?.object || platform,
          entry: [{ ...entry, messaging: [event], changes: undefined }],
        },
      })
    }
    for (const change of entry?.changes || []) {
      const value = change?.value || {}
      const id = value?.id || value?.comment_id || value?.message?.mid || payloadHash(change)
      pieces.push({
        platform,
        idempotencyKey: `${platform}:${change?.field || "change"}:${id}`,
        accountKey,
        payload: {
          object: body?.object || platform,
          entry: [{ id: entry?.id, time: entry?.time, changes: [change] }],
        },
      })
    }
  }
  return pieces
}

export function commentTextsFromPayload(payload: any): string[] {
  const texts: string[] = []
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {}
      const candidates = [value.text, value.message]
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim().length > 2) texts.push(candidate.trim())
      }
    }
  }
  return texts
}

/** First insert wins. A duplicate key is the retry and must not be processed again. */
export function rememberEvent(
  store: Map<string, StoredEvent>,
  event: { idempotencyKey: string; accountKey: string },
  now: number,
): { inserted: boolean; row: StoredEvent } {
  const existing = store.get(event.idempotencyKey)
  if (existing) return { inserted: false, row: existing }
  const row: StoredEvent = {
    idempotencyKey: event.idempotencyKey,
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    lockedAt: null,
    lastError: null,
    accountKey: event.accountKey,
  }
  store.set(event.idempotencyKey, row)
  return { inserted: true, row }
}

/**
 * Claim due work. A processing row whose lock is older than the timeout is
 * claimed again, so a worker that died mid-send does not leave the event stuck.
 */
export function claimEvents(
  store: Map<string, StoredEvent>,
  now: number,
  limit: number,
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
): StoredEvent[] {
  const due = [...store.values()]
    .filter((row) => {
      if (row.status === "pending") return row.nextAttemptAt <= now
      if (row.status === "processing") return row.lockedAt !== null && row.lockedAt < now - lockTimeoutMs
      return false
    })
    .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt)
    .slice(0, limit)

  for (const row of due) {
    row.status = "processing"
    row.lockedAt = now
  }
  return due.map((row) => ({ ...row }))
}

export function finishEvent(store: Map<string, StoredEvent>, idempotencyKey: string, now: number): void {
  const row = store.get(idempotencyKey)
  if (!row) return
  row.status = "done"
  row.lockedAt = null
  row.lastError = null
  row.nextAttemptAt = now
}

export function backoffDelayMs(
  attempt: number,
  baseMs = DEFAULT_BACKOFF_BASE_MS,
  capMs = DEFAULT_BACKOFF_CAP_MS,
): number {
  const exponent = Math.max(0, attempt - 1)
  return Math.min(baseMs * 2 ** exponent, capMs)
}

export function failurePlan(
  attemptsAfter: number,
  now: number,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): { status: "pending" | "dead"; nextAttemptAt: number } {
  if (attemptsAfter >= maxAttempts) {
    return { status: "dead", nextAttemptAt: now }
  }
  return { status: "pending", nextAttemptAt: now + backoffDelayMs(attemptsAfter) }
}

export function failEvent(
  store: Map<string, StoredEvent>,
  idempotencyKey: string,
  now: number,
  error: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): StoredEvent | null {
  const row = store.get(idempotencyKey)
  if (!row) return null
  const attempts = row.attempts + 1
  const plan = failurePlan(attempts, now, maxAttempts)
  row.attempts = attempts
  row.status = plan.status
  row.nextAttemptAt = plan.nextAttemptAt
  row.lockedAt = null
  row.lastError = error
  return { ...row }
}

/** Rate limit holds the row without consuming a failure attempt. */
export function deferEvent(
  store: Map<string, StoredEvent>,
  idempotencyKey: string,
  until: number,
): StoredEvent | null {
  const row = store.get(idempotencyKey)
  if (!row) return null
  row.status = "pending"
  row.lockedAt = null
  row.nextAttemptAt = until
  return { ...row }
}

export function takeRateToken(
  bucket: RateBucket | null,
  now: number,
  limit = DEFAULT_RATE_LIMIT,
  windowMs = DEFAULT_RATE_WINDOW_MS,
): { allowed: boolean; bucket: RateBucket; retryAt: number } {
  const fresh = !bucket || now - bucket.windowStart >= windowMs
  const current: RateBucket = fresh ? { windowStart: now, count: 0 } : { ...bucket }
  if (current.count >= limit) {
    return { allowed: false, bucket: current, retryAt: current.windowStart + windowMs }
  }
  current.count += 1
  return { allowed: true, bucket: current, retryAt: current.windowStart + windowMs }
}

export function inboundRateLimit(): number {
  const parsed = Number(process.env.INBOUND_RATE_LIMIT)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RATE_LIMIT
}

export function inboundRateWindowMs(): number {
  const parsed = Number(process.env.INBOUND_RATE_WINDOW_MS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RATE_WINDOW_MS
}
