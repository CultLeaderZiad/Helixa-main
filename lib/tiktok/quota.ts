/** TikTok send limits from the Business Messaging send guide (doc 1832184403754242). */

export const TIKTOK_WINDOW_MS = 48 * 60 * 60 * 1000
export const TIKTOK_MAX_MESSAGES = 10
/** Partner docs describe about 10 requests per second. The official send page does not publish a QPS number. */
export const TIKTOK_RATE_PER_SECOND = 10

export type TikTokSendKind = "reply" | "broadcast" | "proactive" | "sender_action" | "comment_reply"

export type TikTokQuotaReason = "no_user_message" | "window_expired" | "message_cap" | "broadcast_forbidden"

export interface TikTokWindowState {
  lastUserMessageAt: number | null
  businessSends: number
}

export function emptyTikTokWindow(): TikTokWindowState {
  return { lastUserMessageAt: null, businessSends: 0 }
}

/** Each inbound user message opens a new 48-hour window and another 10 sends. */
export function recordUserMessage(at: number): TikTokWindowState {
  return { lastUserMessageAt: at, businessSends: 0 }
}

/**
 * User-initiated replies only. Broadcasts are refused even inside the window.
 * Sender actions (typing, mark read) do not consume the 10-message quota.
 * A comment reply is itself a user initiation, so a missing or expired window
 * does not block that first message. The caller resets the window when it sends.
 */
export function judgeTikTokSend(input: {
  lastUserMessageAt: number | null
  businessSends: number
  now: number
  kind?: TikTokSendKind
}): { allowed: boolean; reason?: TikTokQuotaReason } {
  const kind = input.kind || "reply"
  if (kind === "broadcast") return { allowed: false, reason: "broadcast_forbidden" }
  if (kind === "sender_action") return { allowed: true }
  if (kind === "proactive") return { allowed: false, reason: "no_user_message" }

  const open = input.lastUserMessageAt != null && input.now - input.lastUserMessageAt <= TIKTOK_WINDOW_MS
  if (kind === "comment_reply") {
    if (!open) return { allowed: true }
    if (input.businessSends >= TIKTOK_MAX_MESSAGES) return { allowed: false, reason: "message_cap" }
    return { allowed: true }
  }

  if (input.lastUserMessageAt == null) return { allowed: false, reason: "no_user_message" }
  if (!open) return { allowed: false, reason: "window_expired" }
  if (input.businessSends >= TIKTOK_MAX_MESSAGES) return { allowed: false, reason: "message_cap" }
  return { allowed: true }
}

export function takeTikTokRequestSlot(
  stamps: number[],
  now: number,
  limit = TIKTOK_RATE_PER_SECOND,
): { allowed: boolean; stamps: number[] } {
  const kept = stamps.filter((stamp) => now - stamp < 1000 && stamp <= now)
  if (kept.length >= limit) return { allowed: false, stamps: kept }
  return { allowed: true, stamps: [...kept, now] }
}

let rateStamps: number[] = []

export function allowTikTokRequest(now = Date.now(), limit = TIKTOK_RATE_PER_SECOND): boolean {
  const next = takeTikTokRequestSlot(rateStamps, now, limit)
  rateStamps = next.stamps
  return next.allowed
}

export function resetTikTokRateLimiter(): void {
  rateStamps = []
}
