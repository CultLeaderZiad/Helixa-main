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
    const botInfo = await getBotInfo(botToken)
    if (!botInfo) {
      return NextResponse.json({ error: "Invalid Telegram bot token. Please check and try again." }, { status: 400 })
    }

    // 2. Set the webhook
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://helixa-main-ecru.vercel.app"
    // Token is in the path as Telegram's security measure
    const webhookUrl = `${appUrl}/api/telegram/webhook/${botToken}`
    
    const webhookSuccess = await setWebhook(botToken, webhookUrl)
    if (!webhookSuccess) {
      return NextResponse.json({ error: "Failed to register webhook with Telegram. Please try again." }, { status: 502 })
    }

    // 3. Encrypt the token for secure storage at rest
    const encryptedToken = encryptString(botToken)

    // 4. Save to platform_connections
    const supabase = await getSupabaseBypassClient()
    const pageId = botInfo.id.toString()

    const { error: upsertError } = await supabase.from("platform_connections").upsert({
      user_id: igUser.id,
      platform: "telegram",
      page_id: pageId, // Using the bot's user ID as page_id
      access_token: encryptedToken,
      metadata: {
        name: botInfo.first_name,
        username: botInfo.username,
        is_bot: botInfo.is_bot
      }
    }, { onConflict: "user_id, platform, page_id" })

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
