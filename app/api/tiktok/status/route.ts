export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { TIKTOK_OAUTH_SCOPES, tiktokCommentToDmEnabled, tiktokMessagingEnabled } from "@/lib/tiktok/config"

/** What the dashboard shows before a workspace tries to connect TikTok. */
export async function GET(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  return NextResponse.json({
    messagingEnabled: tiktokMessagingEnabled(),
    commentToDmEnabled: tiktokCommentToDmEnabled(),
    scopes: [...TIKTOK_OAUTH_SCOPES],
    limitations: [
      "Business Messaging requires TikTok app approval and a data-security review. US Business Accounts also need the USDS addendum.",
      "Direct messages work after approval. The Business Account must accept messages from everyone, or the owner must accept each request.",
      "Comment-to-Message is only available for Business Accounts registered in Vietnam, Indonesia, or Thailand, and only for commenters in APAC, LATAM, or METAP.",
      "The API does not DM an arbitrary comment, send free-form buttons, or accept a media URL.",
      "The messaging window is 48 hours. There is no Human Agent tag.",
    ],
  })
}
