export const dynamic = 'force-dynamic'
/* @ts-nocheck */

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { decryptString } from "@/lib/crypto"
import {
  sendTelegramAutomationResponse,
  sendTelegramMessage,
  answerTelegramCallbackQuery,
} from "@/lib/telegram-api"
import { parseContent, pickVariant, keywordMatches, checkTrialStatus } from "@/lib/webhook-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const resolvedParams = await params
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
      .or(`page_id.eq.${botId},external_account_id.eq.${botId}`)
      .maybeSingle()

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

    // Fetch user & account to check plan / bans
    const { data: user } = await supabase.from("users").select("*").eq("id", userId).single()
    if (!user) {
      return NextResponse.json({ success: true })
    }

    if (user.account_id) {
      const { data: account } = await supabase
        .from("accounts")
        .select("id, plan, trial_ends_at, trial_exempt, is_banned")
        .eq("id", user.account_id)
        .single()

      if (account) {
        if (account.is_banned) {
          console.log(`[Telegram Webhook] 🛑 Account ${account.id} is banned. Skipping.`)
          return NextResponse.json({ success: true })
        }

        const effectivePlan = await checkTrialStatus(supabase, account)
        if (effectivePlan === "expired") {
          return NextResponse.json({ success: true })
        }
      }
    }

    // 4. Parse Telegram Update
    let update: any
    try {
      update = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    let senderId: string | null = null
    let chatId: string | null = null
    let senderUsername = "Telegram User"
    let triggerType = "keyword"
    let triggerValue = ""

    if (update.callback_query) {
      senderId = update.callback_query.from?.id?.toString()
      chatId = update.callback_query.message?.chat?.id?.toString() || senderId
      senderUsername =
        update.callback_query.from?.username ||
        update.callback_query.from?.first_name ||
        "Telegram User"
      triggerType = "postback"
      triggerValue = update.callback_query.data || ""

      // Acknowledge callback query
      await answerTelegramCallbackQuery(rawToken, update.callback_query.id)
    } else if (update.message) {
      senderId = update.message.from?.id?.toString()
      chatId = update.message.chat?.id?.toString()
      senderUsername =
        update.message.from?.username ||
        update.message.from?.first_name ||
        "Telegram User"
      triggerType = "keyword"
      triggerValue = update.message.text || update.message.caption || ""
    }

    if (!senderId || !chatId || !triggerValue) {
      return NextResponse.json({ success: true })
    }

    console.log(`[Telegram Webhook] 📩 Message from ${senderUsername} (${senderId}): "${triggerValue}"`)

    // 5. Persist Conversation & Incoming Message
    let conv: any = null
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, recipient_username")
        .eq("user_id", userId)
        .eq("recipient_id", senderId)
        .eq("platform", "telegram")
        .maybeSingle()

      if (!existing) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            recipient_id: senderId,
            recipient_username: senderUsername,
            platform: "telegram",
            last_message_at: new Date().toISOString(),
          })
          .select("id, recipient_username")
          .single()
        conv = newConv
      } else {
        conv = existing
        await supabase
          .from("conversations")
          .update({
            recipient_username: senderUsername,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      }

      if (conv) {
        await supabase.from("messages").insert({
          id: update.message?.message_id?.toString() || `tg_${Date.now()}_${Math.random()}`,
          conversation_id: conv.id,
          user_id: userId,
          sender_id: senderId,
          sender_username: senderUsername,
          content: triggerValue,
          is_from_instagram: false,
          platform: "telegram",
        })
      }
    } catch (err) {
      console.error("[Telegram Webhook] Failed to save incoming message:", err)
    }

    // 6. Fetch Active Automations for User
    const { data: automations } = await supabase
      .from("automations")
      .select("*, automation_variants(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .or("platform.eq.telegram,platform.is.null")

    let match: any = null

    if (automations && automations.length > 0) {
      const dmAutomations = automations.filter(
        (a: any) => a.trigger_source === "dm" || !a.trigger_source,
      )

      if (triggerType === "postback") {
        if (triggerValue.startsWith("UNLOCK_CONTENT_")) {
          const ruleId = triggerValue.replace("UNLOCK_CONTENT_", "")
          match = automations.find((a: any) => a.id === ruleId)
        } else if (triggerValue.startsWith("SYS_CARD_")) {
          const parts = triggerValue.split("_")
          const ruleId = parts[2]
          const variantId = parts.length > 3 && parts[3] !== "default" ? parts.slice(3).join("_") : null
          const rule = automations.find((a: any) => a.id === ruleId)
          if (rule) {
            let responseContent = rule.response_content
            if (variantId && rule.automation_variants) {
              const v = rule.automation_variants.find((v: any) => v.id === variantId)
              if (v) responseContent = v.response_config
            }
            match = { id: rule.id, name: "System Card Reply", response_content: responseContent }
          }
        } else {
          match = dmAutomations.find((a: any) => a.trigger_type === "postback" && a.trigger_value === triggerValue)
          if (!match) {
            match = dmAutomations.find(
              (a: any) => a.trigger_type === "keyword" && keywordMatches(a.trigger_value, triggerValue),
            )
          }
        }
      } else {
        match = dmAutomations.find(
          (a: any) => a.trigger_type === "keyword" && keywordMatches(a.trigger_value, triggerValue),
        )
        if (!match) {
          match = dmAutomations.find((a: any) => a.trigger_type === "reply_all")
        }
      }
    }

    // 7. AI Auto-Reply fallback if no match and user has AI enabled
    if (!match && user.ai_enabled) {
      try {
        const { generateGroqCompletion } = await import("@/lib/groq-client")
        const { buildConversationMessages, fetchConversationHistory } = await import("@/lib/llm-provider")
        const history = await fetchConversationHistory(conv?.id, 8)
        const systemPrompt = `You are a helpful customer service AI assistant on Telegram for @${user.username || "our business"}.
Context/Instructions: ${user.ai_context || "Be helpful, concise, and polite."}
Reply in the same language the customer uses. Keep responses short (1-3 sentences), friendly and human. Never mention that you are an AI unless directly asked.`
        const messages = buildConversationMessages({
          systemPrompt,
          history,
          currentMessage: triggerValue,
        })

        const aiReply = await generateGroqCompletion(user.id, "auto_reply", {
          messages,
        })

        if (aiReply) {
          await sendTelegramMessage(rawToken, chatId, aiReply)

          if (conv) {
            try {
              await supabase.from("messages").insert({
                id: `tg_ai_${Date.now()}_${Math.random()}`,
                conversation_id: conv.id,
                user_id: userId,
                sender_id: botId,
                sender_username: "AI Assistant",
                content: aiReply,
                is_from_instagram: false,
                platform: "telegram",
              })
            } catch (e) {}
          }

          try {
            await supabase.from("automation_events").insert({
              user_id: userId,
              automation_id: "AI_AUTO_REPLY",
              event_type: "sent",
              platform: "telegram",
            })
          } catch (e) {}

          console.log(`[Telegram Webhook] 🤖 AI Auto-reply sent to ${senderId}`)
          return NextResponse.json({ success: true })
        }
      } catch (e) {
        console.error("[Telegram Webhook] AI Auto-reply error:", e)
      }
    }

    if (!match) {
      return NextResponse.json({ success: true })
    }

    // 8. Execute Matched Automation
    const { content: rawContent, variantId } = pickVariant(match)
    const content = parseContent(rawContent)
    console.log(`[Telegram Webhook] ✅ Triggering automation "${match.name}" (variant: ${variantId || "default"})`)

    const sendResult = await sendTelegramAutomationResponse(rawToken, chatId, content, {
      automationId: match.id,
      variantId,
    })

    if (sendResult.ok) {
      // Log outgoing message to conversation
      if (conv) {
        try {
          let replyPreview = ""
          if (typeof content === "string") replyPreview = content
          else if (content.message) replyPreview = content.message
          else if (content.card) replyPreview = `[Card: ${content.card.title || "Sent"}]`
          else if (content.media?.url) replyPreview = `[Media: ${content.media.type || "image"}]`

          await supabase.from("messages").insert({
            id: `tg_reply_${Date.now()}_${Math.random()}`,
            conversation_id: conv.id,
            user_id: userId,
            sender_id: botId,
            sender_username: "Bot",
            content: replyPreview || "[Automated Reply]",
            is_from_instagram: false,
            platform: "telegram",
          })
        } catch (e) {
          console.error("[Telegram Webhook] Failed to save outgoing message:", e)
        }
      }

      // Log automation event with valid schema
      try {
        await supabase.from("automation_events").insert({
          user_id: userId,
          automation_id: match.id,
          event_type: "sent",
          platform: "telegram",
          variant_id: variantId,
        })
      } catch (e) {
        console.error("[Telegram Webhook] Failed to log automation_event:", e)
      }
    } else {
      console.error("[Telegram Webhook] Failed to send Telegram response:", sendResult.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error)
    // MUST return 200 to prevent Telegram from retrying (which causes duplicate messages)
    return NextResponse.json({ ok: true })
  }
}
