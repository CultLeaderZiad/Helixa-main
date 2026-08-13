export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

/**
 * POST /api/facebook/discover
 *
 * Accepts a short-lived User Access Token from FB.login() (client-side SDK),
 * exchanges it for a long-lived token, then lists the Facebook Pages the user
 * manages. Returns page metadata to the frontend for the Page Picker UI.
 *
 * Never returns raw access tokens to the client.
 */
export async function POST(request: NextRequest) {
  const result = await requireInstagramUser(request)
  if (result.response) return result.response
  const { igUser } = result

  let body: { accessToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { accessToken } = body
  if (!accessToken) {
    return NextResponse.json({ error: "Missing accessToken in body" }, { status: 400 })
  }

  const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
  const clientSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET

  if (!clientId || !clientSecret) {
    console.error("[FB Discover] Missing App ID or App Secret in env vars")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  try {
    // 1. Exchange the short-lived token for a long-lived token (60 days)
    const longLivedUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token")
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token")
    longLivedUrl.searchParams.set("client_id", clientId)
    longLivedUrl.searchParams.set("client_secret", clientSecret)
    longLivedUrl.searchParams.set("fb_exchange_token", accessToken)

    const longRes = await fetch(longLivedUrl.toString())
    const longData = await longRes.json()

    if (!longRes.ok || !longData.access_token) {
      console.error("[FB Discover] Long-lived token exchange failed:", longData)
      return NextResponse.json({ error: "Failed to exchange token with Facebook" }, { status: 502 })
    }

    const longLivedToken = longData.access_token

    // 2. List Pages the user manages
    const accountsUrl = new URL("https://graph.facebook.com/v20.0/me/accounts")
    accountsUrl.searchParams.set("fields", "id,name,category,access_token")
    accountsUrl.searchParams.set("access_token", longLivedToken)

    const accountsRes = await fetch(accountsUrl.toString())
    const accountsData = await accountsRes.json()

    if (!accountsRes.ok || !accountsData.data) {
      console.error("[FB Discover] Failed to fetch /me/accounts:", accountsData)
      return NextResponse.json({ error: "Failed to fetch Pages from Facebook" }, { status: 502 })
    }

    if (accountsData.data.length === 0) {
      return NextResponse.json({ error: "no_pages", pages: [] }, { status: 200 })
    }

    // 3. Build the page list (never expose tokens to client)
    const pages = accountsData.data.map((page: any) => ({
      id: page.id,
      name: page.name,
      category: page.category || "Unknown",
    }))

    console.log(`[FB Discover] Found ${pages.length} pages for user ${igUser.id}`)

    // Return pages + the long-lived token (the client will pass it back to /connect)
    // The token is short-lived context only used in the next step, travels over HTTPS.
    return NextResponse.json({
      pages,
      _token: longLivedToken,
    })
  } catch (error) {
    console.error("[FB Discover] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

