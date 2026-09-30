import type { ChannelAdapter } from "@/lib/channels/types"

export const STANDARD_WINDOW_MS = 24 * 60 * 60 * 1000
export const HUMAN_AGENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const COMMENT_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type WindowStatus = "open" | "human_agent" | "closed" | "not_applicable"

export interface WindowVerdict {
  status: WindowStatus
  /** The send is outside the standard window. The UI should say so. */
  flagged: boolean
  messagingType?: "RESPONSE" | "MESSAGE_TAG"
  tag?: "HUMAN_AGENT"
  reason?: "outside_window" | "no_inbound"
  lastInboundAt: string | null
  windowMs: number | null
}

function parseTime(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Meta's standard messaging window is 24 hours from the contact's last inbound
 * message. Instagram and Messenger may use the Human Agent tag through 7 days.
 * WhatsApp has no tag in this phase (templates are a later piece), so a send
 * outside 24 hours is blocked. Telegram has no window.
 *
 * A reply to the webhook that just arrived is inside the window by construction.
 */
export function evaluateMessagingWindow(input: {
  windowMs: number | null
  supportsHumanAgent: boolean
  lastInboundAt: string | number | null
  now: number
  inboundJustNow?: boolean
}): WindowVerdict {
  const base = {
    lastInboundAt: input.lastInboundAt == null ? null : String(input.lastInboundAt),
    windowMs: input.windowMs,
  }
  if (input.windowMs == null) {
    return { ...base, status: "not_applicable", flagged: false }
  }
  if (input.inboundJustNow) {
    return { ...base, status: "open", flagged: false, messagingType: "RESPONSE" }
  }
  const inboundAt = parseTime(input.lastInboundAt)
  if (inboundAt == null) {
    return { ...base, status: "closed", flagged: true, reason: "no_inbound" }
  }
  const age = input.now - inboundAt
  if (age <= input.windowMs) {
    return { ...base, status: "open", flagged: false, messagingType: "RESPONSE", lastInboundAt: new Date(inboundAt).toISOString() }
  }
  if (input.supportsHumanAgent && age <= HUMAN_AGENT_WINDOW_MS) {
    return {
      ...base,
      status: "human_agent",
      flagged: true,
      messagingType: "MESSAGE_TAG",
      tag: "HUMAN_AGENT",
      lastInboundAt: new Date(inboundAt).toISOString(),
    }
  }
  return {
    ...base,
    status: "closed",
    flagged: true,
    reason: "outside_window",
    lastInboundAt: new Date(inboundAt).toISOString(),
  }
}

export function windowForAdapter(
  adapter: Pick<ChannelAdapter, "messagingWindowMs" | "supportsHumanAgent">,
  lastInboundAt: string | number | null,
  now: number,
  inboundJustNow = false,
): WindowVerdict {
  return evaluateMessagingWindow({
    windowMs: adapter.messagingWindowMs,
    supportsHumanAgent: adapter.supportsHumanAgent,
    lastInboundAt,
    now,
    inboundJustNow,
  })
}

export function commentReplyOpen(occurredAtMs: number | undefined, now: number): boolean {
  if (!occurredAtMs) return true
  return now - occurredAtMs <= COMMENT_REPLY_WINDOW_MS
}

export function sendContextFromVerdict(
  token: string,
  recipientId: string | undefined,
  verdict: WindowVerdict,
  senderRef?: string,
): { accessToken: string; recipientId?: string; senderRef?: string; messagingType?: "RESPONSE" | "MESSAGE_TAG"; tag?: "HUMAN_AGENT" } {
  return {
    accessToken: token,
    recipientId,
    senderRef,
    messagingType: verdict.messagingType,
    tag: verdict.tag,
  }
}
