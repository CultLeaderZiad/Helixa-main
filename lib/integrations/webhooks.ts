import { createHmac, randomBytes, timingSafeEqual, createHash } from "crypto"
import { failurePlan } from "@/lib/event-pipeline"

export const WEBHOOK_EVENTS = ["contact.created", "lead.qualified", "order.created", "order.updated", "tag.added"] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export function signWebhook(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
}

export function webhookHeaders(secret: string, body: string, nowMs: number): Record<string, string> {
  const timestamp = Math.floor(nowMs / 1000)
  return {
    "Content-Type": "application/json",
    "X-Helixa-Timestamp": String(timestamp),
    "X-Helixa-Signature": signWebhook(secret, timestamp, body),
  }
}

export function verifyWebhookSignature(input: {
  secret: string
  timestamp: string | number | null
  body: string
  signature: string | null
  nowMs: number
  toleranceSec?: number
}): boolean {
  const timestamp = Number(input.timestamp)
  if (!input.signature || !Number.isFinite(timestamp)) return false
  const drift = Math.abs(Math.floor(input.nowMs / 1000) - timestamp)
  if (drift > (input.toleranceSec ?? 300)) return false
  const expected = signWebhook(input.secret, timestamp, input.body)
  const left = Buffer.from(expected)
  const right = Buffer.from(input.signature)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/** Same backoff as the inbound queue. Attempt 5 of 5 is dead. */
export function nextWebhookAttempt(attemptsAfter: number, nowMs: number, maxAttempts = 5) {
  return failurePlan(attemptsAfter, nowMs, maxAttempts)
}

export function generateApiKey(): { token: string; hash: string; prefix: string } {
  const token = `hx_live_${randomBytes(24).toString("base64url")}`
  return { token, hash: hashApiKey(token), prefix: token.slice(0, 12) }
}

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
