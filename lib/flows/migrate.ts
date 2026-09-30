import { parseContent } from "@/lib/webhook-utils"
import type { FlowGraph, FlowNode, FlowTrigger } from "@/lib/flows/types"
import { botLocale, botText, followSubtitle, publicReplies, type BotLocale } from "@/lib/bot-copy"

export interface LegacyAutomation {
  id: string
  name?: string | null
  platform?: string | null
  trigger_source?: string | null
  trigger_type?: string | null
  trigger_value?: string | null
  specific_media_id?: string | null
  response_content?: unknown
  is_active?: boolean | null
  check_follow?: boolean | null
  delay_seconds?: number | null
}

export interface MigratedFlow {
  sourceAutomationId: string
  name: string
  channel: string
  trigger: FlowTrigger
  graph: FlowGraph
}

function defaultPublic(locale: BotLocale): string[] {
  return publicReplies(locale)
}

function node(id: string, type: FlowNode["type"], y: number, data: Record<string, unknown>): FlowNode {
  return { id, type, position: { x: 80, y }, data }
}

function edge(source: string, target: string, handle?: string) {
  return {
    id: `e_${source}_${target}_${handle || "default"}`,
    source,
    target,
    sourceHandle: handle || "default",
  }
}

function channelOf(rule: LegacyAutomation): string {
  const platform = rule.platform || "instagram"
  if (platform === "facebook") return "messenger"
  return platform
}

export function triggerForAutomation(rule: LegacyAutomation): FlowTrigger {
  const channel = channelOf(rule)
  const source = rule.trigger_source || "dm"
  const type = rule.trigger_type || "keyword"
  const keywords = rule.trigger_value || ""
  if (source === "comment") {
    return {
      type: "comment",
      channel,
      keywords: type === "keyword" ? keywords : null,
      match: type === "reply_all" ? "reply_all" : "keyword",
      mediaId: rule.specific_media_id || null,
      anyPost: !rule.specific_media_id,
    }
  }
  if (source === "story") {
    if (type === "mention") {
      return { type: "story_mention", channel, mediaId: rule.specific_media_id || null }
    }
    if (type === "reaction") {
      return {
        type: "story_reaction",
        channel,
        mediaId: rule.specific_media_id || null,
        reaction: keywords || "ALL",
      }
    }
    return {
      type: "story_reply",
      channel,
      mediaId: rule.specific_media_id || null,
      keywords: keywords && keywords !== "ALL" && keywords !== "ALL_MENTIONS" ? keywords : null,
      match: !keywords || keywords === "ALL" || keywords === "ALL_MENTIONS" ? "reply_all" : "keyword",
    }
  }
  if (type === "postback") {
    return { type: "keyword_dm", channel, keywords, match: "exact" }
  }
  if (type === "reply_all") {
    return { type: "keyword_dm", channel, match: "reply_all" }
  }
  return { type: "keyword_dm", channel, keywords, match: "keyword" }
}

/**
 * One single-step rule becomes a trigger, an optional public reply, an optional
 * delay, an optional follow gate, and the same outbound message.
 * The legacy row stays. A live flow with this source id replaces its send.
 */
export function automationToFlow(rule: LegacyAutomation, locale: BotLocale = "en"): MigratedFlow {
  const content = parseContent(rule.response_content)
  const channel = channelOf(rule)
  const trigger = triggerForAutomation(rule)
  const nodes: FlowNode[] = [node("trigger", "trigger", 40, { trigger })]
  const edges: MigratedFlow["graph"]["edges"] = []
  let previous = "trigger"
  let y = 200
  const mode = content.reply_mode || "both"
  const isComment = (rule.trigger_source || "") === "comment"

  if (isComment && mode !== "dm_only") {
    const variants = Array.isArray(content.public_replies)
      ? content.public_replies.map((item: unknown) => String(item || "")).filter(Boolean)
      : []
    nodes.push(node("public", "public_reply", y, { variants: variants.length ? variants : defaultPublic(locale) }))
    edges.push(edge(previous, "public"))
    previous = "public"
    y += 160
  }

  const delaySeconds = Number(rule.delay_seconds || content.delay_seconds || 0)
  if (Number.isFinite(delaySeconds) && delaySeconds > 0) {
    nodes.push(
      node("delay", "smart_delay", y, {
        delayMs: delaySeconds * 1000,
        respectWindow: true,
        skipIfReplied: false,
      }),
    )
    edges.push(edge(previous, "delay"))
    previous = "delay"
    y += 160
  }

  const message = typeof content.message === "string" ? content.message : content.reply_text || ""
  const sendData: Record<string, unknown> = {
    text: message,
    media: content.media || null,
    buttons: content.card?.buttons || [],
    quickReplies: content.quick_replies || [],
    waitFor: "none",
  }

  if (rule.check_follow || content.check_follow) {
    nodes.push(
      node("gate", "send_message", y, {
        text: followSubtitle(locale, "us"),
        buttons: [
          { title: botText(locale, "follow"), url: "https://instagram.com/" },
          { title: botText(locale, "followed"), payload: `UNLOCK_CONTENT_${rule.id}` },
        ],
        waitFor: "button",
      }),
    )
    edges.push(edge(previous, "gate"))
    nodes.push(node("send", "send_message", y + 160, sendData))
    edges.push(edge("gate", "send", `UNLOCK_CONTENT_${rule.id}`))
  } else if (mode !== "public_only") {
    nodes.push(node("send", "send_message", y, sendData))
    edges.push(edge(previous, "send"))
  }

  return {
    sourceAutomationId: rule.id,
    name: rule.name || "Automation",
    channel,
    trigger,
    graph: { nodes, edges },
  }
}

/** Rules that already have a flow are left untouched, so running this twice does not fork them. */
export function planAutomationMigration(rules: LegacyAutomation[], alreadyMigrated: Set<string>, locale: BotLocale = "en"): MigratedFlow[] {
  const seen = new Set<string>()
  const planned: MigratedFlow[] = []
  for (const rule of rules) {
    if (!rule?.id || alreadyMigrated.has(rule.id) || seen.has(rule.id)) continue
    seen.add(rule.id)
    planned.push(automationToFlow(rule, botLocale(locale)))
  }
  return planned
}
