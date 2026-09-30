export const dynamic = "force-dynamic"
import { type NextRequest, NextResponse } from "next/server"
import { forbidBelow, loadWorkspaceContext } from "@/lib/auth"
import {
  createOAuthState,
  IG_OAUTH_STATE_COOKIE,
  INSTAGRAM_LOGIN_SCOPES,
  instagramAppId,
  oauthCookieOptions,
} from "@/lib/instagram-oauth"

/**
 * GET /api/instagram/auth
 * Redirects the user to Meta's Instagram OAuth dialog ("Instagram API with
 * Instagram Login"). A random `state` is stored in an httpOnly cookie and
 * checked on the callback so a forged redirect cannot attach someone else's
 * Instagram account to the logged-in Helixa user.
 */
export async function GET(request: NextRequest) {
  const session = await loadWorkspaceContext(request)
  if (!session) return NextResponse.redirect(new URL("/login", request.url))
  if (session.denied || forbidBelow(session.account.workspace_role, "admin")) {
    return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=forbidden", request.url))
  }

  const clientId = instagramAppId()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || `${appUrl}/api/instagram/callback`

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Instagram integration is not configured. Please contact support." },
      { status: 503 },
    )
  }

  const state = createOAuthState()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_LOGIN_SCOPES,
    response_type: "code",
    state,
  })

  const response = NextResponse.redirect(`https://api.instagram.com/oauth/authorize?${params.toString()}`)
  response.cookies.set(IG_OAUTH_STATE_COOKIE, state, oauthCookieOptions(10 * 60))
  return response
}
