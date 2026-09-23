export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"

/**
 * POST /api/facebook/connect
 *
 * Saves a user-selected Facebook Page as a platform connection.
 * Called after the user picks a Page from the discover step.
 *
 * Steps:
 * 1. Fetch the definitive Page Access Token from the Graph API
 * 2. Subscribe the Page to the app's webhook events
 * 3. Upsert into platform_connections (facebook + messenger)
 */
export async function POST(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  const { user: account, igUser } = result

  let body: { page_id?: string; _token?: string; session_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { page_id, _token, session_id } = body
  if (!page_id || (!_token && !session_id)) {
    return NextResponse.json({ error: "Missing page_id and session/token in body" }, { status: 400 })
  }

  const supabase = await getSupabaseBypassClient()

  // Resolve the user access token. Preferred path: server-side OAuth session
  // (encrypted, short-lived, one-time-use). Legacy `_token` is still accepted
  // for one release so in-flight clients don't break.
  let userAccessToken = _token || ""

  if (session_id) {
    const { data: session } = await supabase
      .from("oauth_sessions")
      .select("id, token_encrypted, expires_at, account_id, provider")
      .eq("id", session_id)
      .eq("provider", "facebook")
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: "Session expired or not found. Please click Connect Facebook again." }, { status: 400 })
    }
    if (session.account_id !== account.id) {
      return NextResponse.json({ error: "Session does not belong to this account" }, { status: 403 })
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Session expired. Please click Connect Facebook again." }, { status: 400 })
    }

    const { decryptString } = await import("@/lib/crypto")
    const decrypted = decryptString(session.token_encrypted)
    if (!decrypted) {
      return NextResponse.json({ error: "Failed to read session. Please try connecting again." }, { status: 500 })
    }
    userAccessToken = decrypted

    // One-time use: burn the session immediately after reading it
    await supabase.from("oauth_sessions").delete().eq("id", session.id)
  }

  if (!userAccessToken) {
    return NextResponse.json({ error: "Could not resolve access token" }, { status: 400 })
  }
  let userId = igUser?.id

  if (!userId) {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("account_id", account.id)
      .maybeSingle()

    if (existingUser) {
      userId = existingUser.id
    } else {
      const fallbackId = Math.floor(1000000000 + Math.random() * 9000000000)
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          id: fallbackId,
          account_id: account.id,
          username: account.email?.split("@")[0] || `user_${account.id.slice(0, 8)}`,
          access_token: "facebook_managed",
        })
        .select("id")
        .maybeSingle()
      userId = newUser?.id || fallbackId
    }
  }

  try {
    // 1. Fetch the Page Access Token + metadata for the specific page
    const pageUrl = new URL(`https://graph.facebook.com/v20.0/${page_id}`)
    pageUrl.searchParams.set("fields", "access_token,name,category")
    pageUrl.searchParams.set("access_token", userAccessToken)

    const pageRes = await fetch(pageUrl.toString())
    const pageData = await pageRes.json()

    if (!pageRes.ok || !pageData.access_token) {
      console.error("[FB Connect] Failed to fetch page token:", pageData)
      return NextResponse.json({
        error: "Failed to fetch Page Access Token. The selected Page may not be accessible with the granted permissions.",
      }, { status: 502 })
    }

    const pageAccessToken = pageData.access_token
    const pageName = pageData.name || "Facebook Page"
    const pageCategory = pageData.category || "Unknown"

    // 2. Subscribe the Page to webhook events (best-effort — don't block on failure)
    let webhookSubscribed = false
    try {
      const subscribeUrl = new URL(`https://graph.facebook.com/v20.0/${page_id}/subscribed_apps`)
      subscribeUrl.searchParams.set("subscribed_fields", "messages,messaging_postbacks,feed")
      subscribeUrl.searchParams.set("access_token", pageAccessToken)

      const subRes = await fetch(subscribeUrl.toString(), { method: "POST" })
      const subData = await subRes.json()

      if (subRes.ok && subData.success) {
        webhookSubscribed = true
        console.log(`[FB Connect] Webhook subscription successful for page ${page_id}`)
      } else {
        console.warn(`[FB Connect] Webhook subscription failed for page ${page_id}:`, subData)
      }
    } catch (subError) {
      console.warn(`[FB Connect] Webhook subscription error for page ${page_id}:`, subError)
    }

    // 3. Upsert into platform_connections
    const fbData = {
      user_id: userId,
      platform: "facebook",
      page_id: page_id,
      external_account_id: page_id,
      access_token: pageAccessToken,
      metadata: { name: pageName, category: pageCategory, webhook_subscribed: webhookSubscribed },
    }
    
    const { data: existingFb } = await supabase.from("platform_connections")
      .select("id").eq("user_id", userId).eq("platform", "facebook").eq("page_id", page_id).maybeSingle()
      
    let fbResult;
    if (existingFb) {
      fbResult = await supabase.from("platform_connections").update(fbData).eq("id", existingFb.id)
    } else {
      fbResult = await supabase.from("platform_connections").insert(fbData)
    }

    if (fbResult.error) {
      console.error("[FB Connect] Failed to upsert facebook connection:", fbResult.error)
      throw new Error("Failed to save Facebook connection: " + fbResult.error.message)
    }

    // Also create a messenger connection with the same token (matches old callback behavior)
    const msgData = {
      user_id: userId,
      platform: "messenger",
      page_id: page_id,
      external_account_id: page_id,
      access_token: pageAccessToken,
      metadata: { name: pageName, category: pageCategory, webhook_subscribed: webhookSubscribed },
    }
    
    const { data: existingMsg } = await supabase.from("platform_connections")
      .select("id").eq("user_id", userId).eq("platform", "messenger").eq("page_id", page_id).maybeSingle()
      
    let msgResult;
    if (existingMsg) {
      msgResult = await supabase.from("platform_connections").update(msgData).eq("id", existingMsg.id)
    } else {
      msgResult = await supabase.from("platform_connections").insert(msgData)
    }

    if (msgResult.error) {
      console.error("[FB Connect] Failed to upsert messenger connection:", msgResult.error)
      // Don't throw — FB connection was saved, messenger is secondary
    }

    console.log(`[FB Connect] Successfully connected page ${page_id} (${pageName}) for user ${userId}`)

    return NextResponse.json({
      success: true,
      page: { id: page_id, name: pageName },
      webhook_subscribed: webhookSubscribed,
    })
  } catch (error) {
    console.error("[FB Connect] Unexpected error:", error)
    return NextResponse.json({ error: "Something went wrong connecting to Facebook. Please try again." }, { status: 500 })
  }
}

