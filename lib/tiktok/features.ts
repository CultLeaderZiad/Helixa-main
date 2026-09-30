import { COMMENT_TO_DM_TEMPLATES, commentToDmFlow } from "@/lib/growth/tools"
import type { MigratedFlow } from "@/lib/flows/migrate"
import { matchTikTokIntent } from "@/lib/tiktok/intents"

const TIKTOK_HANDLE = /^[A-Za-z0-9._]{2,24}$/
const REF_CODE = /^[A-Za-z0-9_-]{2,64}$/

/**
 * tiktok.me referral links. The `ref` query is what a referral webhook should
 * echo, and `message` is the prefilled composer text. The QR code encodes this URL.
 */
export function tiktokMeLink(input: {
  username: string
  ref?: string | null
  message?: string | null
}): { ok: true; url: string; code: string } | { ok: false; error: string } {
  const username = input.username.trim().replace(/^@/, "")
  if (!TIKTOK_HANDLE.test(username)) return { ok: false, error: "TikTok username is invalid" }
  const code = (input.ref || "").trim()
  if (code && !REF_CODE.test(code)) return { ok: false, error: "Code must be 2–64 letters, numbers, _ or -" }
  const params = new URLSearchParams()
  if (code) params.set("ref", code)
  const message = (input.message || "").trim()
  if (message) params.set("message", message.slice(0, 500))
  const query = params.toString()
  return { ok: true, url: `https://tiktok.me/${username}${query ? `?${query}` : ""}`, code }
}

/** QA button card body for POST /business/message/send/. Title max 40. Up to 3 REPLY buttons. */
export function suggestedQuestionsBody(questions: string[], title = "How can we help?"): Record<string, unknown> | null {
  const buttons = questions.map((item) => item.trim()).filter(Boolean).slice(0, 3)
  if (buttons.length === 0) return null
  return {
    message_type: "TEMPLATE",
    template: {
      type: "QA_BUTTON_CARD",
      title: title.trim().slice(0, 40) || "How can we help?",
      buttons: buttons.map((label, index) => ({
        type: "REPLY",
        title: label.slice(0, 20),
        id: `q${index + 1}`,
      })),
    },
  }
}

/**
 * Public reply on a video comment.
 * POST /open_api/v1.3/business/comment/reply/create/
 * Confirmed by the v1.3 What's New note (7 Aug 2026) and the official request body
 * `{ business_id, video_id, comment_id, text }`. Text max was raised to 1200 characters.
 */
export function publicCommentReplyBody(input: {
  businessId: string
  videoId: string
  commentId: string
  text: string
}): Record<string, unknown> {
  return {
    business_id: input.businessId,
    video_id: input.videoId,
    comment_id: input.commentId,
    text: input.text.slice(0, 1200),
  }
}

export function commentLead(input: {
  uniqueIdentifier: string
  username?: string | null
  text: string
  videoId?: string | null
  commentId: string
}): {
  externalId: string
  username: string | null
  source: "tiktok_comment"
  text: string
  videoId: string | null
  commentId: string
} {
  return {
    externalId: input.uniqueIdentifier,
    username: input.username || null,
    source: "tiktok_comment",
    text: input.text.slice(0, 500),
    videoId: input.videoId || null,
    commentId: input.commentId,
  }
}

export function tiktokDmPlan(input: {
  firstSeen: boolean
  matched: boolean
  welcome: string
  defaultReply: string
  suggestedQuestions: string[]
}): { sendWelcome: boolean; sendQuestions: boolean; sendDefault: boolean } {
  return {
    sendWelcome: input.firstSeen && input.welcome.trim().length > 0,
    sendQuestions: input.firstSeen && input.suggestedQuestions.some((item) => item.trim()),
    sendDefault: !input.matched && input.defaultReply.trim().length > 0,
  }
}

export function tiktokKeywordOrIntent(trigger: string, text: string): boolean {
  return matchTikTokIntent(trigger, text)
}

/**
 * Optional Instagram comment-to-DM for the same keyword campaign.
 * This builds the Instagram flow. It does not call Meta.
 */
export function instagramCrossPostPlan(keyword: string): {
  channel: "instagram"
  keyword: string
  flow: MigratedFlow | null
  publicReply: string
} {
  const word = keyword.trim() || "PRICE"
  const template = COMMENT_TO_DM_TEMPLATES.find((item) => item.keyword.toLowerCase() === word.toLowerCase())
  const flow = template
    ? commentToDmFlow({ templateId: template.id, keyword: word, channel: "instagram" })
    : commentToDmFlow({ templateId: "link", keyword: word, channel: "instagram" })
  return {
    channel: "instagram",
    keyword: word,
    flow,
    publicReply: template?.publicReplies[0] || "Check your DMs",
  }
}
