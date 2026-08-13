export const dynamic = 'force-dynamic'
/**
 * DEPRECATED — This server-redirect OAuth route is no longer used by the frontend.
 * The Connected Platforms page now uses the Facebook JS SDK (FB.login popup) →
 * /api/facebook/discover → /api/facebook/connect flow instead.
 *
 * Kept as a fallback reference. Can be safely removed once the SDK flow is
 * confirmed stable in production.
 */
import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI || `${appUrl}/api/facebook/callback`

  if (!clientId || !redirectUri) {
    console.error("[FB Auth] Missing configuration: App ID or Redirect URI is not set.")
    return NextResponse.json({ error: "Missing Facebook configuration in environment variables." }, { status: 500 })
  }

  // IMPORTANT: `business_management` was removed from this scope list.
  // Including it triggers Meta's "Login for Business" dialog, which requires the
  // connecting user to have (or select) a Meta Business Portfolio. If no portfolio
  // exists, the dialog auto-cancels itself before the user can even pick a Page.
  //
  // Limitation: Business-Manager-managed Pages (common for agency customers) will
  // NOT be connectable until `business_management` is re-added AND a Meta Business
  // Portfolio is properly created and linked to this app in the Meta dashboard.
  // When that's ready, add it back: "pages_manage_metadata,...,business_management"
  const scope = "pages_manage_metadata,pages_messaging,pages_read_engagement,pages_show_list"
  const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
  
  return NextResponse.redirect(url)
}

