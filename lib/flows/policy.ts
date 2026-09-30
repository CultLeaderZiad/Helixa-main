import { evaluateMessagingWindow, HUMAN_AGENT_WINDOW_MS, STANDARD_WINDOW_MS } from "@/lib/channels/window"

/** TikTok Business Messaging documents a 48 hour window and no human-agent tag. */
export const TIKTOK_FLOW_WINDOW_MS = 48 * 60 * 60 * 1000

export const BROADCAST_MESSAGE_TAGS = [
  "HUMAN_AGENT",
  "ACCOUNT_UPDATE",
  "CONFIRMED_EVENT_UPDATE",
  "POST_PURCHASE_UPDATE",
] as const

export type BroadcastMessageTag = (typeof BROADCAST_MESSAGE_TAGS)[number]

export type ComplianceReason =
  | "opted_out"
  | "outside_window"
  | "tag_required"
  | "invalid_tag"
  | "whatsapp_template_required"
  | "whatsapp_template_not_approved"
  | "whatsapp_not_opted_in"
  | "tiktok_disabled"
  | "channel_unsupported"
  | "bot_paused"

export interface SendDecision {
  allowed: boolean
  reason?: ComplianceReason
  messagingType?: "RESPONSE" | "MESSAGE_TAG"
  tag?: "HUMAN_AGENT" | BroadcastMessageTag
}

export function channelWindow(channel: string): { windowMs: number | null; supportsHumanAgent: boolean } {
  switch (channel) {
    case "instagram":
    case "messenger":
    case "facebook":
      return { windowMs: STANDARD_WINDOW_MS, supportsHumanAgent: true }
    case "whatsapp":
      return { windowMs: STANDARD_WINDOW_MS, supportsHumanAgent: false }
    case "tiktok":
      return { windowMs: TIKTOK_FLOW_WINDOW_MS, supportsHumanAgent: false }
    default:
      return { windowMs: null, supportsHumanAgent: false }
  }
}

export function isBroadcastTag(value: string | null | undefined): value is BroadcastMessageTag {
  return Boolean(value && (BROADCAST_MESSAGE_TAGS as readonly string[]).includes(value))
}

/**
 * A flow step answering an inbound event, or a follow-up after a delay.
 * WhatsApp free-form is allowed inside the open window. Outside it, only an
 * approved template to an opted-in contact. Instagram and Messenger may use
 * the Human Agent tag through 7 days. Telegram and website chat have no window.
 */
export function flowSendAllowed(input: {
  channel: string
  now: number
  lastInboundAt: string | null
  inboundJustNow?: boolean
  optedIn: boolean
  templateName?: string | null
  templateApproved?: boolean
  tiktokEnabled?: boolean
}): SendDecision {
  const channel = input.channel
  if (channel === "telegram" || channel === "webchat" || channel === "bio") {
    return { allowed: true }
  }
  if (channel === "tiktok" && input.tiktokEnabled === false) {
    return { allowed: false, reason: "tiktok_disabled" }
  }
  const policy = channelWindow(channel)
  const verdict = evaluateMessagingWindow({
    windowMs: policy.windowMs,
    supportsHumanAgent: policy.supportsHumanAgent,
    lastInboundAt: input.lastInboundAt,
    now: input.now,
    inboundJustNow: input.inboundJustNow,
  })

  if (channel === "whatsapp") {
    if (verdict.status === "open") return { allowed: true, messagingType: "RESPONSE" }
    if (input.templateName && input.templateApproved && input.optedIn) return { allowed: true }
    if (!input.templateName || !input.templateApproved) {
      return { allowed: false, reason: "whatsapp_template_required" }
    }
    return { allowed: false, reason: "whatsapp_not_opted_in" }
  }

  if (verdict.status === "open" || verdict.status === "not_applicable") {
    return { allowed: true, messagingType: verdict.messagingType }
  }
  if (verdict.status === "human_agent") {
    return { allowed: true, messagingType: "MESSAGE_TAG", tag: "HUMAN_AGENT" }
  }
  return { allowed: false, reason: "outside_window" }
}

/**
 * Broadcasts are stricter than flow replies.
 * WhatsApp is templates only, and only to opted-in contacts, even inside 24h.
 * Instagram and Messenger send inside 24h, or later with a real message tag.
 * HUMAN_AGENT is only valid through 7 days. The other tags are not capped at 7 days.
 * Telegram and website chat send freely. Opted-out contacts are skipped everywhere.
 */
export function evaluateBroadcastCompliance(input: {
  channel: string
  now: number
  lastInboundAt: string | null
  optedIn: boolean
  optedOut: boolean
  templateName?: string | null
  templateApproved?: boolean
  messageTag?: string | null
}): SendDecision {
  if (input.optedOut) return { allowed: false, reason: "opted_out" }
  const channel = input.channel
  if (channel === "telegram" || channel === "webchat" || channel === "bio") return { allowed: true }

  if (channel === "whatsapp") {
    if (!input.optedIn) return { allowed: false, reason: "whatsapp_not_opted_in" }
    if (!input.templateName) return { allowed: false, reason: "whatsapp_template_required" }
    if (!input.templateApproved) return { allowed: false, reason: "whatsapp_template_not_approved" }
    return { allowed: true }
  }

  if (channel === "tiktok") {
    const verdict = evaluateMessagingWindow({
      windowMs: TIKTOK_FLOW_WINDOW_MS,
      supportsHumanAgent: false,
      lastInboundAt: input.lastInboundAt,
      now: input.now,
    })
    if (verdict.status === "open") return { allowed: true, messagingType: "RESPONSE" }
    return { allowed: false, reason: "outside_window" }
  }

  if (channel === "instagram" || channel === "messenger" || channel === "facebook") {
    const verdict = evaluateMessagingWindow({
      windowMs: STANDARD_WINDOW_MS,
      supportsHumanAgent: true,
      lastInboundAt: input.lastInboundAt,
      now: input.now,
    })
    if (verdict.status === "open") return { allowed: true, messagingType: "RESPONSE" }
    const tag = (input.messageTag || "").trim()
    if (!tag) return { allowed: false, reason: verdict.status === "human_agent" ? "tag_required" : "outside_window" }
    if (!isBroadcastTag(tag)) return { allowed: false, reason: "invalid_tag" }
    if (tag === "HUMAN_AGENT") {
      if (verdict.status !== "human_agent") return { allowed: false, reason: "outside_window" }
      return { allowed: true, messagingType: "MESSAGE_TAG", tag: "HUMAN_AGENT" }
    }
    return { allowed: true, messagingType: "MESSAGE_TAG", tag }
  }

  return { allowed: false, reason: "channel_unsupported" }
}

export { HUMAN_AGENT_WINDOW_MS, STANDARD_WINDOW_MS }
