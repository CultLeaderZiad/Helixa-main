export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { TIKTOK_OAUTH_SCOPES, tiktokMessagingEnabled, tiktokUsReviewApproved } from "@/lib/tiktok/config"
import { COMMENT_TO_MESSAGE_REGIONS } from "@/lib/tiktok/region"

/** What the dashboard shows before a workspace tries to connect TikTok. */
export async function GET(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  return NextResponse.json({
    messagingEnabled: tiktokMessagingEnabled(),
    usReviewApproved: tiktokUsReviewApproved(),
    commentToMessageRegions: [...COMMENT_TO_MESSAGE_REGIONS],
    scopes: [...TIKTOK_OAUTH_SCOPES],
    limitations: [
      "Apply with a developer app, the Accounts API access form, and the Business Messaging review. Leave the US out of that application when the account is in Egypt or the GCC.",
      "DMs are available outside the EEA, Switzerland, and the UK. US accounts stay off until TIKTOK_US_REVIEW_APPROVED=true.",
      "Comment-to-Message is only for Business Accounts registered in Vietnam, Indonesia, or Thailand. It turns on for those regions automatically.",
      "Keyword comments get a public reply. They do not send a TikTok DM. A campaign can also queue the same keyword on Instagram.",
      "Replies are user-initiated, capped at 10 messages in the 48 hours after each user message, and TikTok broadcasts are refused. There is no Human Agent tag.",
    ],
  })
}
