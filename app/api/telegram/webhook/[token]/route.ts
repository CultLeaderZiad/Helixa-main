import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { decryptString } from "@/lib/crypto"
import { sendTelegramMessage } from "@/lib/telegram-api"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const rawToken = resolvedParams.token
  if (!rawToken) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 })
  }

  // 1. Extract Bot ID from the token (format: BOT_ID:RANDOM_STRING)
  const botId = rawToken.split(":")[0]
  if (!botId) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 })
  }

  try {
    const supabase = await getSupabaseBypassClient()

    // 2. Fetch the corresponding platform connection
    const { data: connection, error: connError } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("platform", "telegram")
      .eq("page_id", botId)
      .single()

    if (connError || !connection) {
      console.warn(`[Telegram Webhook] Unknown bot ID: ${botId}`)
      return NextResponse.json({ error: "Unknown bot" }, { status: 404 })
    }

    // 3. Verify the token matches the decrypted stored token
    const storedToken = decryptString(connection.access_token)
    if (storedToken !== rawToken) {
      console.warn(`[Telegram Webhook] Token mismatch for bot ID: ${botId}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = connection.user_id

    // 4. Parse the Telegram Update
    let update: any
    try {
      update = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // We only process message updates
    if (update.message && update.message.text) {
      const messageText = update.message.text
      const senderId = update.message.from?.id?.toString()
      const chatId = update.message.chat?.id?.toString()
      
      if (!senderId || !chatId) {
        return NextResponse.json({ success: true }) // Acknowledge to stop retries
      }

      // Log the event
      await supabase.from("webhook_events").insert({
        user_id: userId,
        platform: "telegram",
        event_type: "message",
        payload: update
      })

      // 5. Fetch automations for this user
      const { data: automations } = await supabase
        .from("automations")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("trigger_source", "dm")
        
      if (automations && automations.length > 0) {
        const messageTextLower = messageText.toLowerCase()
        
        // Find matching automation
        let matchedAutomation = null
        for (const automation of automations) {
          // If the rule specifies a platform, it must match
          if (automation.platform && automation.platform !== "telegram") continue
          
          if (!automation.trigger_keywords || automation.trigger_keywords.length === 0) {
            matchedAutomation = automation
            break
          }
          
          const hasKeywordMatch = automation.trigger_keywords.some((keyword: string) => 
            messageTextLower.includes(keyword.toLowerCase())
          )
          
          if (hasKeywordMatch) {
            matchedAutomation = automation
            break
          }
        }

        // Trigger action
        if (matchedAutomation) {
          console.log(`[Telegram Webhook] Triggering automation ${matchedAutomation.id}`)
          
          let responseText = matchedAutomation.response_text
          if (matchedAutomation.response_type === "card" && matchedAutomation.card_title) {
             responseText = `*${matchedAutomation.card_title}*\n${matchedAutomation.card_subtitle || ""}`
          }

          if (responseText) {
            await sendTelegramMessage(rawToken, chatId, responseText)
            
            await supabase.from("automation_events").insert({
               automation_id: matchedAutomation.id,
               user_id: userId,
               platform: "telegram",
               trigger_type: "dm",
               action_taken: "sent_message",
               target_id: senderId,
               metadata: { sent_text: responseText }
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
