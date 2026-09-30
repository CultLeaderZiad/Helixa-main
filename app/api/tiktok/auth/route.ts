export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { forbidBelow, loadWorkspaceContext } from "@/lib/auth"
import { createOAuthState, oauthCookieOptions } from "@/lib/instagram-oauth"
import { tiktokAppId, tiktokMessagingEnabled, tiktokRedirectUri } from "@/lib/tiktok/config"
import { tiktokAuthorizeUrl, TT_OAUTH_STATE_COOKIE } from "@/lib/tiktok/oauth"

/**
 * GET /api/tiktok/auth
 * Sends the workspace admin to TikTok's account-holder authorize dialog.
 * Refuses when Business Messaging is not explicitly enabled.
 */
export async function GET(request: NextRequest) {
  const session = await loadWorkspaceContext(request)
  if (!session) return NextResponse.redirect(new URL("/login", request.url))
  if (session.denied || forbidBelow(session.account.workspace_role, "admin")) {
    return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=forbidden", request.url))
  }
  if (!tiktokMessagingEnabled()) {
    return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=tiktok_disabled", request.url))
  }
  if (!tiktokAppId() || !tiktokRedirectUri()) {
    return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=tiktok_config", request.url))
  }
  const state = createOAuthState()
  const response = NextResponse.redirect(tiktokAuthorizeUrl(state))
  response.cookies.set(TT_OAUTH_STATE_COOKIE, state, oauthCookieOptions(10 * 60))
  return response
}
