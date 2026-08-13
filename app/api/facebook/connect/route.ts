export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

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
  const result = await requireInstagramUser(request)
  if (result.response) return result.response
  const { igUser } = result

  let body: { page_id?: string; _token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { page_id, _token } = body
  if (!page_id || !_token) {
    return NextResponse.json({ error: "Missing page_id or _token in body" }, { status: 400 })
  }

  try {
    // 1. Fetch the Page Access Token + metadata for the specific page
    const pageUrl = new URL(`https://graph.facebook.com/v20.0/${page_id}`)
    pageUrl.searchParams.set("fields", "access_token,name,category")
    pageUrl.searchParams.set("access_token", _token)

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
    const supabase = await getSupabaseBypassClient()

    const fbData = {
      user_id: igUser.id,
      platform: "facebook",
      page_id: page_id,
      external_account_id: page_id,
      access_token: pageAccessToken,
      metadata: { name: pageName, category: pageCategory, webhook_subscribed: webhookSubscribed },
    }
    
    const { data: existingFb } = await supabase.from("platform_connections")
      .select("id").eq("user_id", igUser.id).eq("platform", "facebook").eq("page_id", page_id).maybeSingle()
      
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
      user_id: igUser.id,
      platform: "messenger",
      page_id: page_id,
      external_account_id: page_id,
      access_token: pageAccessToken,
      metadata: { name: pageName, category: pageCategory, webhook_subscribed: webhookSubscribed },
    }
    
    const { data: existingMsg } = await supabase.from("platform_connections")
      .select("id").eq("user_id", igUser.id).eq("platform", "messenger").eq("page_id", page_id).maybeSingle()
      
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

    console.log(`[FB Connect] Successfully connected page ${page_id} (${pageName}) for user ${igUser.id}`)

    return NextResponse.json({
      success: true,
      page: { id: page_id, name: pageName },
      webhook_subscribed: webhookSubscribed,
    })
  } catch (error) {
    console.error("[FB Connect] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

