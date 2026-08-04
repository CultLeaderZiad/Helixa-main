import { NextResponse } from "next/server"

/**
 * GET /api/instagram/auth
 * Redirects the user to Meta's Instagram OAuth dialog ("Instagram API with
 * Instagram Login"). The redirect_uri must exactly match one of the entries
 * configured under the Instagram product -> Business login settings.
 */
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.INSTAGRAM_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || `${appUrl}/api/instagram/callback`

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing config: NEXT_PUBLIC_INSTAGRAM_APP_ID or NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI" },
      { status: 500 }
    )
  }

  const scope = "business_basic,business_content_publish,business_manage_comments,business_manage_messages"
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    response_type: "code",
  })

  return NextResponse.redirect(`https://api.instagram.com/oauth/authorize?${params.toString()}`)
}
