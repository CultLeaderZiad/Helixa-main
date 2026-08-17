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
      .select("*, automation_variants(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("platform", ["facebook", "messenger"])

    if (!automations?.length) continue

    // Plan enforcement
    const { data: account } = await supabase
      .from("accounts")
      .select("plan, trial_ends_at, trial_exempt")
      .eq("id", user.account_id)
      .single()

    if (!account) {
      console.log(`[fb-webhook] ⚠️ Account not found for user ${user.username}. Skipping.`)
      continue
    }

    let effectivePlan = account.plan
    if (account.plan === "trial" && account.trial_ends_at && !account.trial_exempt) {
      const trialEnded = new Date(account.trial_ends_at) < new Date()
      if (trialEnded) {
        effectivePlan = "expired"
        await supabase
          .from("accounts")
          .update({ plan: "expired", updated_at: new Date().toISOString() })
          .eq("id", account.id)
        console.log(`[fb-webhook] ⚠️ Account ${account.id} trial expired. Set plan=expired, skipping automations.`)
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

        // Enforce 7-day eligibility window
        const eventTimeMs = (entry.time || Math.floor(Date.now() / 1000)) * 1000
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - eventTimeMs > sevenDaysMs) {
          console.log(`[fb-webhook] ⚠️ Comment ${commentId} is older than 7 days. Skipping private reply per Meta rules.`)
          continue
        }

        if (senderId === webhookId) continue // ignore own comments

        // Prevent duplicate private replies for the same comment
        const { data: alreadyReplied } = await supabase
          .from("automation_events")
          .select("id")
          .eq("comment_id", commentId)
          .eq("event_type", "comment_dm")
          .maybeSingle()

        if (alreadyReplied) {
          console.log(`[fb-webhook] ⚠️ Already sent private reply for comment ${commentId}. Skipping to prevent Meta rejection.`)
          continue
        }

        // Check keyword matches
        for (const rule of automations) {
          if (rule.trigger_type !== "keyword") continue
          if (!keywordMatches(rule.trigger_value, text)) continue

          console.log(`[fb-webhook] ✅ Comment match! rule=${rule.name} sender=${senderId}`)
            
            // A/B Testing selection
            let responseContent = rule.response_content
            let variantId = null
            if (rule.automation_variants && rule.automation_variants.length > 0) {
              const allOptions = [
                { id: null, content: rule.response_content, weight: 100 - rule.automation_variants.reduce((sum: number, v: any) => sum + (v.traffic_weight || 0), 0) },
                ...rule.automation_variants.map((v: any) => ({ id: v.id, content: v.response_config, weight: v.traffic_weight || 50 }))
              ]
              const random = Math.random() * 100
              let sum = 0
              for (const opt of allOptions) {
                sum += Math.max(0, opt.weight)
                if (random <= sum) {
                  responseContent = opt.content
                  variantId = opt.id
                  break
                }
              }
            }

            await sendAutomationResponse(fbToken, { id: senderId }, responseContent)

            // 4. Send Public Reply if configured
            const rc = responseContent as any
            if (rc?.reply_mode === "both" || rc?.reply_mode === "public_only") {
              if (rc.public_replies && rc.public_replies.length > 0) {
                const replyText = rc.public_replies[Math.floor(Math.random() * rc.public_replies.length)]
                await replyToFacebookComment(fbToken, commentId, replyText)
              }
            }

            await logAutomationEvent(supabase, user.id, rule.id, "comment_dm", senderId, "facebook", variantId, commentId)
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

        // Handle Conversation and Incoming Message Logging
        let conv = null
        try {
          const { data: existing } = await supabase
            .from("conversations")
            .select("id, recipient_username")
            .eq("user_id", user.id)
            .eq("recipient_id", senderId)
            .eq("platform", "messenger")
            .maybeSingle()
            
          if (!existing) {
            const { data: newConv } = await supabase
              .from("conversations")
              .insert({
                user_id: user.id,
                recipient_id: senderId,
                recipient_username: "Facebook User",
                platform: "messenger"
              })
              .select("id, recipient_username")
              .single()
            conv = newConv
          } else {
            conv = existing
            await supabase
              .from("conversations")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", existing.id)
          }

          if (conv && text) {
            await supabase.from("messages").insert({
              id: event.message?.mid || `mid_${Date.now()}_${Math.random()}`,
              conversation_id: conv.id,
              user_id: user.id,
              sender_id: senderId,
              sender_username: "Facebook User",
              content: text,
              is_from_instagram: true,
              platform: "messenger"
            })
          }
        } catch (err) {
          console.error("[fb-webhook] Failed to save incoming message", err)
        }

        for (const rule of automations) {
          let matched = false
          if (isPostback && rule.trigger_type === "postback" && rule.trigger_value === text) {
            matched = true
          } else if (!isPostback && rule.trigger_type === "keyword" && keywordMatches(rule.trigger_value, text)) {
            matched = true
          }

          if (matched) {
            console.log(`[fb-webhook] ✅ DM match! rule=${rule.name} sender=${senderId}`)

            // A/B Testing selection
            let responseContent = rule.response_content
            let variantId = null
            if (rule.automation_variants && rule.automation_variants.length > 0) {
              const allOptions = [
                { id: null, content: rule.response_content, weight: 100 - rule.automation_variants.reduce((sum: number, v: any) => sum + (v.traffic_weight || 0), 0) },
                ...rule.automation_variants.map((v: any) => ({ id: v.id, content: v.response_config, weight: v.traffic_weight || 50 }))
              ]
              const random = Math.random() * 100
              let sum = 0
              for (const opt of allOptions) {
                sum += Math.max(0, opt.weight)
                if (random <= sum) {
                  responseContent = opt.content
                  variantId = opt.id
                  break
                }
              }
            }

            await sendAutomationResponse(fbToken, { id: senderId }, responseContent)
            
            // Log outgoing message to Inbox
            if (conv) {
              try {
                let replyPreview = ""
                if (typeof responseContent === "string") replyPreview = responseContent
                else if (responseContent.message) replyPreview = responseContent.message
                else if (responseContent.card) replyPreview = `[Card: ${responseContent.card.title || "Sent"}]`
                
                await supabase.from("messages").insert({
                  id: `mid_reply_${Date.now()}_${Math.random()}`,
                  conversation_id: conv.id,
                  user_id: user.id,
                  sender_id: connection.page_id,
                  sender_username: user.username || "Bot",
                  content: replyPreview,
                  is_from_instagram: false,
                  platform: "messenger"
                })
              } catch (e) {
                console.error("[fb-webhook] Failed to save outgoing message", e)
              }
            }

            await logAutomationEvent(supabase, user.id, rule.id, "dm_reply", senderId, "messenger", variantId)
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
  variantId?: string,
  commentId?: string
) {
  try {
    await supabase.from("automation_events").insert({
      user_id: userId,
      automation_id: automationId,
      event_type: eventType,
      recipient_id: recipientId,
      platform,
      ...(variantId ? { variant_id: variantId } : {}),
      ...(commentId ? { comment_id: commentId } : {})
    })
  } catch (error) {
    console.error("[fb-webhook] Failed to log automation_event:", error)
  }
}
