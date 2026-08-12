import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI || `${appUrl}/api/facebook/callback`

  if (!clientId || !redirectUri) {
    console.error("[FB Auth] Missing configuration: App ID or Redirect URI is not set.")
    return NextResponse.json({ error: "Missing Facebook configuration in environment variables." }, { status: 500 })
  }

  const scope = "pages_manage_metadata,pages_messaging,pages_read_engagement,pages_show_list,business_management"
  const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&auth_type=rerequest`
  
  return NextResponse.redirect(url)
}
