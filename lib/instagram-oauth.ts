import crypto from "crypto"

export const IG_OAUTH_STATE_COOKIE = "ig_oauth_state"
export const IG_OAUTH_CODE_COOKIE = "ig_oauth_code"

/**
 * Instagram API with Instagram Login scope values.
 * The old `business_*` names were deprecated on 2025-01-27.
 * Content publishing is not requested: this app does not publish media.
 */
export const INSTAGRAM_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",")

export function createOAuthState(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function oauthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

export function instagramAppId(): string | undefined {
  return process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
}
