import { matchesSpecificPost } from "@/lib/channels/match"
import type { NormalizedInbound } from "@/lib/channels/types"
import { keywordMatches } from "@/lib/webhook-utils"
import { isKnownTikTokIntent, matchTikTokIntent } from "@/lib/tiktok/intents"
import type { FlowTrigger } from "@/lib/flows/types"

export interface TriggerContext {
  tiktokEnabled?: boolean
  firstSeen?: boolean
  referral?: string | null
}

function sameChannel(trigger: FlowTrigger, event: NormalizedInbound): boolean {
  if (!trigger.channel) return true
  if (trigger.channel === event.channel) return true
  if (trigger.channel === "messenger" && event.channel === "facebook") return true
  if (trigger.channel === "facebook" && event.channel === "messenger") return true
  return false
}

function postOk(trigger: FlowTrigger, mediaId?: string | null): boolean {
  if (trigger.anyPost || !trigger.mediaId) return true
  if (!mediaId) return false
  if (String(trigger.mediaId) === String(mediaId)) return true
  return matchesSpecificPost(trigger.mediaId, mediaId)
}

function keywordOk(trigger: FlowTrigger, text: string): boolean {
  if (trigger.match === "reply_all") return true
  const keywords = trigger.keywords || ""
  if (trigger.match === "exact") {
    return text.trim().toLowerCase() === keywords.trim().toLowerCase() && keywords.trim().length > 0
  }
  return keywordMatches(keywords, text)
}

export function triggerMatches(trigger: FlowTrigger, event: NormalizedInbound, context: TriggerContext = {}): boolean {
  switch (trigger.type) {
    case "keyword_dm": {
      if (event.kind !== "dm" && event.kind !== "postback") return false
      if (!sameChannel(trigger, event)) return false
      return keywordOk(trigger, event.text || "")
    }
    case "comment": {
      if (event.kind !== "comment") return false
      if (!sameChannel(trigger, event)) return false
      if (!postOk(trigger, event.mediaId)) return false
      if (trigger.match === "reply_all") return true
      if (!trigger.keywords) return false
      return keywordMatches(trigger.keywords, event.text || "")
    }
    case "story_reply": {
      if (event.kind !== "story_reply") return false
      if (!sameChannel(trigger, event)) return false
      if (trigger.mediaId && trigger.mediaId !== event.mediaId) return false
      if (trigger.keywords && trigger.match !== "reply_all") return keywordMatches(trigger.keywords, event.text || "")
      return true
    }
    case "story_mention": {
      if (event.kind !== "story_mention") return false
      if (!sameChannel(trigger, event)) return false
      if (trigger.mediaId && trigger.mediaId !== event.mediaId) return false
      return true
    }
    case "story_reaction": {
      if (event.kind !== "story_reaction") return false
      if (!sameChannel(trigger, event)) return false
      if (trigger.mediaId && trigger.mediaId !== event.mediaId) return false
      if (trigger.reaction && trigger.reaction !== "ALL" && trigger.reaction !== event.reaction) return false
      return true
    }
    case "ice_breaker": {
      if (event.kind !== "dm" && event.kind !== "postback") return false
      if (!sameChannel(trigger, event)) return false
      const question = (trigger.question || "").trim().toLowerCase()
      if (question && event.text.trim().toLowerCase() === question) return true
      if (trigger.iceBreakerId && event.text === `ICE_BREAKER_${trigger.iceBreakerId}`) return true
      if (trigger.keywords && keywordMatches(trigger.keywords, event.text || "")) return true
      return false
    }
    case "website_visitor": {
      if (event.channel !== "webchat") return false
      if (event.kind !== "dm" && event.kind !== "postback") return false
      if (trigger.firstOnly && !context.firstSeen) return false
      if (trigger.keywords && trigger.match !== "reply_all") return keywordMatches(trigger.keywords, event.text || "")
      return true
    }
    case "tiktok_dm": {
      if (!context.tiktokEnabled) return false
      if (event.channel !== "tiktok") return false
      if (event.kind !== "dm" && event.kind !== "postback") return false
      if (trigger.intent) return matchTikTokIntent(trigger.intent, event.text || "")
      if (trigger.keywords && trigger.match !== "reply_all") {
        if (keywordMatches(trigger.keywords, event.text || "")) return true
        if (isKnownTikTokIntent(trigger.keywords)) return matchTikTokIntent(trigger.keywords, event.text || "")
        return false
      }
      return true
    }
    case "ref": {
      const code = (trigger.refCode || "").trim()
      if (!code) return false
      if (!sameChannel(trigger, event)) return false
      const referral = (context.referral || event.referral || "").trim().toLowerCase()
      const text = (event.text || "").trim().toLowerCase()
      const expected = code.toLowerCase()
      if (referral && referral === expected) return true
      if (text === expected || text === `/start ${expected}` || text === `ref_${expected}`) return true
      return false
    }
    default:
      return false
  }
}
