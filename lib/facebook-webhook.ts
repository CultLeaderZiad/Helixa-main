import { NextResponse } from "next/server"
import {
  sendFacebookText,
  sendFacebookCard,
  sendFacebookMedia,
  sendFacebookSenderAction,
  replyToFacebookComment,
  sleep,
} from "./facebook-api"

export async function handleFacebookWebhook(body: any, supabase: any) {
  for (const entry of body.entry) {
    // Skip pure system events (echo / read / delivery)
    if (entry.messaging) {
      const isSystemEvent = entry.messaging.every(
        (event: any) => event.read || event.delivery || (event.message && event.message.is_echo),
      )
      if (isSystemEvent) continue
    }

    const webhookId = entry.id

    // User resolution via platform_connections
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("user_id, platform, access_token, page_id")
      .eq("page_id", webhookId)
      .in("platform", ["facebook", "messenger"])
      .single()

    if (!connection) {
      console.log(`[fb-webhook] ❌ Could not resolve Facebook page ID ${webhookId}`)
      continue
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", connection.user_id)
      .single()

    if (!user) continue

    const { data: automations } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("platform", ["facebook", "messenger"])

    if (!automations?.length) continue

    // Plan enforcement
    let effectivePlan = user.plan
    if (user.plan === "trial" && user.trial_ends_at) {
      const trialEnded = new Date(user.trial_ends_at) < new Date()
      if (trialEnded) {
        effectivePlan = "expired"
        await supabase
          .from("users")
          .update({ plan: "expired", updated_at: new Date().toISOString() })
          .eq("id", user.id)
        console.log(`[fb-webhook] ⚠️ User ${user.username} trial expired. Set plan=expired, skipping automations.`)
      }
    }
    if (effectivePlan === "expired") {
      continue
    }

    const fbToken = connection.access_token

    // ============================================================
    //  PART A: COMMENTS
    // ============================================================
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field !== "feed" || change.value?.item !== "comment" || change.value.verb !== "add") continue
        
        const commentId = change.value.comment_id
        const text = change.value.message || ""
        const senderId = change.value.from?.id

        if (senderId === webhookId) continue // ignore own comments

        // Check keyword matches
        for (const rule of automations) {
          if (rule.trigger_type !== "keyword") continue
          if (!keywordMatches(rule.trigger_value, text)) continue

          console.log(`[fb-webhook] ✅ Keyword match! rule=${rule.name} comment=${commentId}`)

          const content = rule.response_content
          if (content.reply_text) {
            await replyToFacebookComment(fbToken, commentId, content.reply_text)
          }

          if (content.message || content.card || content.media?.url) {
            await sendAutomationResponse(fbToken, { id: senderId }, content)
          }

          await logAutomationEvent(supabase, user.id, rule.id, "comment_dm", senderId, "facebook")
          break
        }
      }
    }

    // ============================================================
    //  PART B: MESSAGES
    // ============================================================
    if (entry.messaging) {
      for (const event of entry.messaging) {
        const senderId = event.sender?.id
        if (!senderId || senderId === webhookId) continue

        const isPostback = !!event.postback
        const text = event.message?.text || event.postback?.payload || ""

        for (const rule of automations) {
          let matched = false
          if (isPostback && rule.trigger_type === "postback" && rule.trigger_value === text) {
            matched = true
          } else if (!isPostback && rule.trigger_type === "keyword" && keywordMatches(rule.trigger_value, text)) {
            matched = true
          }

          if (matched) {
            console.log(`[fb-webhook] ✅ DM match! rule=${rule.name} sender=${senderId}`)
            await sendAutomationResponse(fbToken, { id: senderId }, rule.response_content)
            await logAutomationEvent(supabase, user.id, rule.id, "dm_reply", senderId, "messenger")
            break
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}

// Helpers

function keywordMatches(triggerValue: string, text: string): boolean {
  return triggerValue
    .split(",")
    .map((k: string) => k.trim())
    .filter(Boolean)
    .some((k: string) => {
      try {
        return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)
      } catch {
        return text.includes(k.toLowerCase())
      }
    })
}

async function sendAutomationResponse(
  token: string,
  recipient: { id: string },
  content: any,
) {
  const delaySeconds = Number(content.delay_seconds) || 0
  const useTyping = content.typing_indicator === true

  if (useTyping) await sendFacebookSenderAction(token, recipient.id, "typing_on")
  if (delaySeconds > 0) await sleep(delaySeconds * 1000)

  const quickReplies = Array.isArray(content.quick_replies)
    ? content.quick_replies
        .filter((q: any) => q?.title)
        .map((q: any) => ({ title: q.title, payload: q.payload || `QR_${q.title.toUpperCase().replace(/\s+/g, "_")}` }))
    : undefined

  let result
  if (content.media?.url) {
    result = await sendFacebookMedia(token, recipient, content.media.type || "image", content.media.url)
    if (result.ok && content.message) {
      result = await sendFacebookText(token, recipient, content.message, quickReplies)
    }
  } else if (content.card) {
    result = await sendFacebookCard(token, recipient, content.card)
  } else if (content.message) {
    result = await sendFacebookText(token, recipient, content.message, quickReplies)
  } else {
    result = { ok: false, error: "empty content" }
  }

  if (useTyping) await sendFacebookSenderAction(token, recipient.id, "typing_off")
  return result
}

async function logAutomationEvent(
  supabase: any,
  userId: string,
  automationId: string,
  eventType: string,
  recipientId: string,
  platform: string,
) {
  try {
    await supabase.from("automation_events").insert({
      user_id: userId,
      automation_id: automationId,
      event_type: eventType,
      recipient_id: recipientId,
      platform,
    })
  } catch (e) {
    console.error("[fb-webhook] Failed to log automation_event:", e)
  }
}
