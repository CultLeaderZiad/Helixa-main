export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"

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
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  const { user: account, igUser } = result
  const resolvedUserId = igUser?.id || account.id

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
    return NextResponse.json({ error: "Facebook integration is not configured. Please contact support." }, { status: 503 })
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

    console.log(`[FB Discover] Found ${pages.length} pages for user ${resolvedUserId}`)

    // 4. SECURITY: store the long-lived token SERVER-SIDE as an encrypted,
    //    short-lived, one-time OAuth session. The browser only receives the
    //    opaque session id. Previously the raw token was returned as `_token`
    //    and lived in React state — that must never happen with a token that
    //    is valid for 60 days.
    const { getSupabaseBypassClient } = await import("@/lib/supabase-server")
    const { encryptString } = await import("@/lib/crypto")
    const supabase = await getSupabaseBypassClient()

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min
    const { data: sessionRow, error: sessionError } = await supabase
      .from("oauth_sessions")
      .insert({
        account_id: account.id,
        provider: "facebook",
        token_encrypted: encryptString(longLivedToken),
        expires_at: expiresAt,
      })
      .select("id")
      .single()

    if (sessionError || !sessionRow) {
      console.error("[FB Discover] Failed to persist OAuth session:", sessionError)
      return NextResponse.json({ error: "Failed to prepare connection. Please try again." }, { status: 500 })
    }

    // Opportunistic cleanup of expired sessions (non-blocking)
    supabase.from("oauth_sessions").delete().lt("expires_at", new Date().toISOString()).then(() => {})

    return NextResponse.json({
      pages,
      session_id: sessionRow.id,
    })
  } catch (error) {
    console.error("[FB Discover] Unexpected error:", error)
    return NextResponse.json({ error: "Something went wrong connecting to Facebook. Please try again." }, { status: 500 })
  }
}

