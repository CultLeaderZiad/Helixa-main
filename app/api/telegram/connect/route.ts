export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"
import { getBotInfo, setWebhook } from "@/lib/telegram-api"
import { encryptString } from "@/lib/crypto"

/**
 * POST /api/telegram/connect
 *
 * Connects a Telegram bot by validating its token, setting the webhook,
 * and securely saving the encrypted token in platform_connections.
 */
export async function POST(request: NextRequest) {
  const result = await requireInstagramUser(request)
  if (result.response) return result.response
  const { igUser } = result

  let body: { botToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { botToken } = body
  if (!botToken || typeof botToken !== "string") {
    return NextResponse.json({ error: "Missing or invalid botToken" }, { status: 400 })
  }

  try {
    // 1. Validate the bot token with Telegram
    const botInfoResult = await getBotInfo(botToken)
    if (!botInfoResult.ok || !botInfoResult.bot) {
      return NextResponse.json({ error: `Invalid Telegram bot token: ${botInfoResult.error}` }, { status: 400 })
    }
    const botInfo = botInfoResult.bot

    // 2. Set the webhook
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://helixa-main-ecru.vercel.app"
    let validatedAppUrl = rawAppUrl.trim().replace(/^['"]+|['"]+$/g, '').replace(/\/+$/, '')
    
    // Deep fix: skip webhook if testing on localhost since Telegram blocks HTTP webhooks
    const isLocal = validatedAppUrl.includes("localhost") || validatedAppUrl.startsWith("http://")

    if (!isLocal && !validatedAppUrl.startsWith("https://")) {
      return NextResponse.json({ 
        error: `Server configuration error: NEXT_PUBLIC_APP_URL must start with 'https://' for Telegram webhooks. Current value: '${rawAppUrl}'` 
      }, { status: 500 })
    }

    // Token is in the path as Telegram's security measure
    const webhookUrl = `${validatedAppUrl}/api/telegram/webhook/${botToken}`
    
    let webhookSubscribed = false
    
    if (isLocal) {
      console.warn(`[Telegram Connect] Skipping webhook registration for local development: ${validatedAppUrl}`)
    } else {
      const webhookResult = await setWebhook(botToken, webhookUrl)
      if (!webhookResult.ok) {
        return NextResponse.json({ error: `Failed to register webhook with Telegram: ${webhookResult.error}` }, { status: 502 })
      }
      webhookSubscribed = true
    }

    // 3. Encrypt the token for secure storage at rest
    const encryptedToken = encryptString(botToken)

    // 4. Save to platform_connections
    const supabase = await getSupabaseBypassClient()
    const pageId = botInfo.id.toString()

    const telegramData = {
      user_id: igUser.id,
      platform: "telegram",
      page_id: pageId, // Using the bot's user ID as page_id
      external_account_id: pageId,
      access_token: encryptedToken,
      metadata: {
        name: botInfo.first_name,
        username: botInfo.username,
        is_bot: botInfo.is_bot,
        webhook_subscribed: webhookSubscribed
      }
    }
    
    const { data: existingTg } = await supabase.from("platform_connections")
      .select("id").eq("user_id", igUser.id).eq("platform", "telegram").eq("page_id", pageId).maybeSingle()
      
    let upsertError;
    if (existingTg) {
      const { error } = await supabase.from("platform_connections").update(telegramData).eq("id", existingTg.id)
      upsertError = error
    } else {
      const { error } = await supabase.from("platform_connections").insert(telegramData)
      upsertError = error
    }

    if (upsertError) {
      console.error("[Telegram Connect] Failed to save connection:", upsertError)
      return NextResponse.json({ error: "Failed to save connection to database" }, { status: 500 })
    }

    console.log(`[Telegram Connect] Successfully connected bot @${botInfo.username} for user ${igUser.id}`)

    return NextResponse.json({
      success: true,
      bot: {
        id: pageId,
        name: botInfo.first_name,
        username: botInfo.username
      }
    })
  } catch (error) {
    console.error("[Telegram Connect] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

