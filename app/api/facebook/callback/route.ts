import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    const redirectUrl = new URL("/dashboard/settings?error=" + encodeURIComponent(error), request.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code) {
    return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
  }

  // Get current user session
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.redirect(new URL("/?error=not_logged_in", request.url))
  }

  const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID
  const clientSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI || `${appUrl}/api/facebook/callback`

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Missing Env Vars" }, { status: 500 })
  }

  try {
    // 1. Exchange Code for short token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch("https://graph.facebook.com/v20.0/oauth/access_token?" + tokenParams.toString())
    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/dashboard/settings?error=token_failed", request.url))
    }

    const shortToken = tokenData.access_token

    // 2. Exchange for long token (60 Days)
    const longLivedUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`
    const longRes = await fetch(longLivedUrl)
    const longData = await longRes.json()
    const accessToken = longData.access_token || shortToken

    // 3. Get Pages (Accounts) user manages
    const accountsRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`)
    const accountsData = await accountsRes.json()

    if (!accountsData.data || accountsData.data.length === 0) {
      return NextResponse.redirect(new URL("/dashboard/settings?error=no_pages", request.url))
    }

    const supabase = await getSupabaseServerClient()

    // 4. Save to platform_connections
    // We will save each page. Note that pages_messaging requires page access token, which is returned in /me/accounts
    for (const page of accountsData.data) {
      const pageAccessToken = page.access_token
      const pageId = page.id
      
      await supabase.from("platform_connections").upsert({
        user_id: user.id,
        platform: "facebook",
        page_id: pageId,
        access_token: pageAccessToken,
        metadata: { name: page.name, category: page.category }
      }, { onConflict: 'user_id, platform, page_id' })

      await supabase.from("platform_connections").upsert({
        user_id: user.id,
        platform: "messenger",
        page_id: pageId,
        access_token: pageAccessToken,
        metadata: { name: page.name, category: page.category }
      }, { onConflict: 'user_id, platform, page_id' })
    }

    return NextResponse.redirect(new URL("/dashboard/settings?success=1", request.url))
  } catch (error) {
    console.error("Facebook auth error:", error)
    return NextResponse.redirect(new URL("/dashboard/settings?error=server_error", request.url))
  }
}
