/**
 * TikTok Business Messaging is approval-gated.
 * Docs: https://business-api.tiktok.com/portal/docs/access-to-business-messaging-api/v1.3
 *
 * Both flags default off. Set them only after the developer app has passed
 * TikTok's data-security review (and the USDS addendum, for US accounts).
 */

export const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3"

/**
 * Scopes requested on the TikTok account-holder authorize URL.
 * `message.list.read` receives DMs, `message.list.send` replies,
 * `message.list.manage` covers read state. The profile scopes identify the
 * Business Account. Do not add video.publish; this app does not post videos.
 */
export const TIKTOK_OAUTH_SCOPES = [
  "user.info.basic",
  "user.info.username",
  "user.info.profile",
  "user.account.type",
  "message.list.read",
  "message.list.send",
  "message.list.manage",
] as const

export function tiktokMessagingEnabled(): boolean {
  return process.env.TIKTOK_MESSAGING_ENABLED === "true"
}

/**
 * Comment-to-Message is a separate product switch inside Business Messaging.
 * Official limit: the Business Account must be registered in Vietnam,
 * Indonesia, or Thailand, and the commenter must be in APAC, LATAM, or METAP.
 * A keyword rule cannot DM an arbitrary comment.
 */
export function tiktokCommentToDmEnabled(): boolean {
  return tiktokMessagingEnabled() && process.env.TIKTOK_COMMENT_TO_DM_ENABLED === "true"
}

export function tiktokAppId(): string {
  return process.env.TIKTOK_APP_ID || ""
}

export function tiktokAppSecret(): string {
  return process.env.TIKTOK_APP_SECRET || ""
}

export function tiktokRedirectUri(): string {
  const explicit = process.env.TIKTOK_REDIRECT_URI
  if (explicit) return explicit
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
  return origin ? `${origin}/api/tiktok/callback` : ""
}
