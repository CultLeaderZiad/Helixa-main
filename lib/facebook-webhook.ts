/* @ts-nocheck */
import { NextResponse } from "next/server"
import {
  sendFacebookText,
  sendFacebookCard,
  sendFacebookMedia,
  sendFacebookSenderAction,
  replyToFacebookComment,
  fetchFacebookProfile,
  sleep,
} from "./facebook-api"
import { processLeadCapture } from "./lead-capture"
import { parseContent, pickRandom, pickVariant, keywordMatches, checkTrialStatus } from "./webhook-utils"

const DEFAULT_PUBLIC_REPLIES = ["Check your inbox! 📥", "Sent you a message! 🔥", "Check your DMs! ✨"]

/**
 * Robust Facebook post ID matcher handling both raw IDs and {page_id}_{post_id} formats.
 */
function matchesSpecificPost(specificMediaId?: string | null, eventPostId?: string | null): boolean {
  if (!specificMediaId || !eventPostId) return false
  const s = String(specificMediaId).trim()
  const e = String(eventPostId).trim()
  if (s === e) return true
  if (e.endsWith(`_${s}`) || s.endsWith(`_${e}`)) return true
  return false
}

async function sendAutomationResponse(
  token: string,
  recipient: { id?: string; comment_id?: string },
  content: any,
  opts: { skipTyping?: boolean; automationId?: string; variantId?: string | null } = {},
) {
  const delaySeconds = Number(content.delay_seconds) || 0
  const useTyping = content.typing_indicator === true && recipient.id && !opts.skipTyping

  if (useTyping) await sendFacebookSenderAction(token, recipient.id!, "typing_on")
  if (delaySeconds > 0) await sleep(delaySeconds * 1000)

  let result
  if (recipient.comment_id) {
    // Meta Private replies to comments only accept plain text.
    // If it's a card, append web URLs as clickable links.
    let text = content.message || (content.card ? content.card.title : "[Automated Reply]")
    if (content.card && Array.isArray(content.card.buttons)) {
      const links = content.card.buttons
        .filter((b: any) => b.type === "web_url" && b.url)
        .map((b: any) => `${b.title}:\n${b.url}`)
        .join("\n\n")
      if (links) {
        text += "\n\n" + links
      }
    }
    result = await sendFacebookText(token, recipient, text)
  } else {
    const quickReplies = Array.isArray(content.quick_replies)
      ? content.quick_replies
          .filter((q: any) => q?.title)
          .map((q: any) => ({
            title: q.title,
            payload: q.payload || `QR_${q.title.toUpperCase().replace(/\s+/g, "_")}`,
          }))
      : undefined

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
  }

  if (useTyping) await sendFacebookSenderAction(token, recipient.id!, "typing_off")
  return result
}

export async function handleFacebookWebhook(body: any, supabase: any) {
  for (const entry of body.entry) {
    // Skip pure system events (echo / read / delivery)
    if (entry.messaging) {
      const isSystemEvent = entry.messaging.every(
        (event: any) => event.read || event.delivery || (event.message && event.message.is_echo),
      )
      if (isSystemEvent) continue
    }

    const webhookId = String(entry.id)

    // User resolution via platform_connections
    let { data: connection } = await supabase
      .from("platform_connections")
      .select("user_id, platform, access_token, page_id")
      .or(`page_id.eq.${webhookId},external_account_id.eq.${webhookId}`)
      .in("platform", ["facebook", "messenger"])
      .maybeSingle()

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
      .select("plan, trial_ends_at, trial_exempt, is_banned")
      .eq("id", user.account_id)
      .single()

    if (!account) {
      console.log(`[fb-webhook] ⚠️ Account not found for user ${user.username}. Skipping.`)
      continue
    }

    if (account.is_banned) {
      console.log(`[fb-webhook] 🛑 Account ${account.id} is banned. Skipping.`)
      continue
    }

    const effectivePlan = await checkTrialStatus(supabase, account)
    if (effectivePlan === "expired") {
      continue
    }

    const fbToken = connection.access_token

    // ============================================================
    //  PART A: COMMENTS & FEED
    // ============================================================
    if (entry.changes) {
      for (const change of entry.changes) {
        const isComment =
          (change.field === "feed" && change.value?.item === "comment" && change.value.verb === "add") ||
          (change.field === "comments" && change.value?.text)

        if (!isComment) continue

        const commentId = change.value.comment_id || change.value.id
        const text = (change.value.message || change.value.text || "").toLowerCase().trim()
        const senderId = change.value.from?.id
        const postId = change.value.post_id || change.value.media?.id || null
        const parentId = change.value.parent_id || null

        // Enforce 7-day eligibility window per Meta rules
        const eventTimeMs = (entry.time || Math.floor(Date.now() / 1000)) * 1000
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - eventTimeMs > sevenDaysMs) {
          console.log(`[fb-webhook] ⚠️ Comment ${commentId} is older than 7 days. Skipping private reply per Meta rules.`)
          continue
        }

        if (senderId === webhookId || senderId === connection.page_id) continue // ignore page's own comments

        // Prevent duplicate private replies for the same comment
        const { data: alreadyReplied } = await supabase
          .from("automation_events")
          .select("id")
          .eq("comment_id", commentId)
          .maybeSingle()

        if (alreadyReplied) {
          console.log(`[fb-webhook] ⚠️ Already sent private reply for comment ${commentId}. Skipping.`)
          continue
        }

        const commentAutomations = automations.filter(
          (a: any) => a.trigger_source === "comment" || !a.trigger_source,
        )

        // Priority matching:
        // 1. Specific post keyword (ONLY if postId matches this specific automation)
        // 2. Specific post reply-all (ONLY if postId matches this specific automation)
        // 3. Global keyword (ONLY if automation has NO specific_media_id)
        // 4. Global reply-all (ONLY if automation has NO specific_media_id)
        let match = commentAutomations.find(
          (a: any) =>
            matchesSpecificPost(a.specific_media_id, postId) &&
            a.trigger_type === "keyword" &&
            keywordMatches(a.trigger_value, text),
        )
        if (!match) {
          match = commentAutomations.find(
            (a: any) =>
              matchesSpecificPost(a.specific_media_id, postId) &&
              a.trigger_type === "reply_all",
          )
        }
        if (!match) {
          match = commentAutomations.find(
            (a: any) =>
              !a.specific_media_id &&
              a.trigger_type === "keyword" &&
              keywordMatches(a.trigger_value, text),
          )
        }
        if (!match) {
          match = commentAutomations.find(
            (a: any) => !a.specific_media_id && a.trigger_type === "reply_all",
          )
        }

        if (!match) {
          console.log(`[fb-webhook] No automation matched for comment ${commentId} on post ${postId}`)
          continue
        }

        const { content: rawContent, variantId } = pickVariant(match)
        const content = parseContent(rawContent)

        // Skip nested replies unless opted in
        if (parentId && content.include_replies !== true) continue

        console.log(`[fb-webhook] ✅ Comment match: "${match.name}" (variant: ${variantId || "default"}, post: ${postId || "global"})`)

        const replyMode = content.reply_mode || "both"

        // Public reply to comment
        if (replyMode !== "dm_only") {
          const pool =
            Array.isArray(content.public_replies) && content.public_replies.filter(Boolean).length > 0
              ? content.public_replies.filter(Boolean)
              : DEFAULT_PUBLIC_REPLIES
          await replyToFacebookComment(fbToken, commentId, pickRandom(pool))
        }

        // Private reply to commenter via comment_id
        if (replyMode !== "public_only") {
          const leadCaptureResult = await processLeadCapture(
            supabase,
            user.id,
            senderId,
            change.value.from?.name || "Facebook User",
            fbToken,
            text,
            match,
            content,
            commentId,
          )

          if (leadCaptureResult.shouldContinue) {
            await sendAutomationResponse(
              fbToken,
              { comment_id: commentId },
              content,
              { skipTyping: true, automationId: match.id, variantId },
            )
          }
        }

        try {
          await supabase.from("automation_events").insert({
            user_id: user.id,
            automation_id: match.id,
            event_type: "sent",
            platform: "facebook",
            variant_id: variantId,
            comment_id: commentId,
            post_id: postId ? String(postId) : null,
            metadata: { post_id: postId, comment_text: text },
          })
        } catch (e) {
          console.error("[fb-webhook] Failed to log automation_event:", e)
        }

        // Asynchronously analyze comment sentiment via Groq and cache in comment_sentiment
        if (postId && text && account?.id) {
          import("./sentiment-analyzer").then(({ classifyAndCacheCommentSentiment }) => {
            classifyAndCacheCommentSentiment(supabase, account.id, String(postId), String(commentId), text).catch((err) =>
              console.warn("[fb-webhook] Background comment sentiment classification error:", err)
            )
          }).catch((importErr) => console.warn("[fb-webhook] Sentiment analyzer unavailable:", importErr))
        }
      }
    }

    // ============================================================
    //  PART B: MESSAGES (MESSENGER DMS)
    // ============================================================
    if (entry.messaging) {
      for (const event of entry.messaging) {
        if (event.read || event.delivery || event.reaction || event.message?.is_echo) continue

        const senderId = event.sender?.id
        if (!senderId || senderId === webhookId || senderId === connection.page_id) continue

        let triggerType = ""
        let triggerValue = ""

        if (event.message?.quick_reply?.payload) {
          triggerType = "postback"
          triggerValue = event.message.quick_reply.payload
        } else if (event.postback?.payload) {
          triggerType = "postback"
          triggerValue = event.postback.payload
        } else if (event.message?.text) {
          triggerType = "keyword"
          triggerValue = event.message.text.trim()
        } else {
          continue
        }

        console.log(`[fb-webhook] 📩 Messenger DM from ${senderId}: "${triggerValue}"`)

        // Persist conversation & incoming message
        let conv: any = null
        try {
          const { data: existing } = await supabase
            .from("conversations")
            .select("id, recipient_username")
            .eq("user_id", user.id)
            .eq("recipient_id", senderId)
            .eq("platform", "messenger")
            .maybeSingle()

          if (!existing) {
            let realName = `Facebook User (${senderId.slice(0, 5)}...)`
            const profile = await fetchFacebookProfile(fbToken, senderId)
            if (profile?.name) realName = profile.name

            const { data: newConv } = await supabase
              .from("conversations")
              .insert({
                user_id: user.id,
                recipient_id: senderId,
                recipient_username: realName,
                platform: "messenger",
                last_message_at: new Date().toISOString(),
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

          if (conv) {
            await supabase.from("messages").insert({
              id: event.message?.mid || `mid_${Date.now()}_${Math.random()}`,
              conversation_id: conv.id,
              user_id: user.id,
              sender_id: senderId,
              sender_username: conv.recipient_username || "Facebook User",
              content: triggerValue,
              is_from_instagram: false,
              platform: "messenger",
            })
          }
        } catch (err) {
          console.error("[fb-webhook] Failed to save incoming message", err)
        }

        // Match DM Automations
        const dmAutomations = automations.filter((a: any) => a.trigger_source === "dm" || !a.trigger_source)
        let match: any = null

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

        // AI Auto-Reply fallback
        if (!match && user.ai_enabled) {
          try {
            const { generateGroqCompletion } = await import("@/lib/groq-client")
            const { buildConversationMessages, fetchConversationHistory } = await import("@/lib/llm-provider")
            const history = await fetchConversationHistory(conv?.id, 8)
            const systemPrompt = `You are a helpful customer service AI assistant for a Facebook Page.
Context/Instructions from owner: ${user.ai_context || "Be helpful, concise, and friendly."}
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
              const content = { message: aiReply }
              await sendAutomationResponse(fbToken, { id: senderId }, content)

              if (conv) {
                try {
                  const { error: msgErr } = await supabase.from("messages").insert({
                    id: `mid_ai_${Date.now()}_${Math.random()}`,
                    conversation_id: conv.id,
                    user_id: user.id,
                    sender_id: connection.page_id,
                    sender_username: "AI Assistant",
                    content: aiReply,
                    is_from_instagram: false,
                    platform: "messenger",
                  })
                  if (msgErr) console.warn("[fb-webhook] Failed to store AI reply message:", msgErr.message)
                } catch (e) {
                  console.warn("[fb-webhook] Failed to store AI reply message:", e)
                }
              }

              try {
                const { error: evErr } = await supabase.from("automation_events").insert({
                  user_id: user.id,
                  automation_id: "AI_AUTO_REPLY",
                  event_type: "sent",
                  platform: "facebook",
                })
                if (evErr) console.warn("[fb-webhook] Failed to log automation_event (AI auto-reply):", evErr.message)
              } catch (e) {
                console.warn("[fb-webhook] Failed to log automation_event (AI auto-reply):", e)
              }

              console.log(`[fb-webhook] 🤖 AI Auto-reply sent to ${senderId}`)
              continue
            }
          } catch (e) {
            console.error("[fb-webhook] AI Auto-reply failed:", e)
          }
        }

        if (!match) continue

        const { content: rawContent, variantId } = pickVariant(match)
        const content = parseContent(rawContent)
        console.log(`[fb-webhook] ✅ DM match: "${match.name}" (variant: ${variantId || "default"})`)

        // Send Automation Response
        await sendAutomationResponse(fbToken, { id: senderId }, content, {
          automationId: match.id,
          variantId,
        })

        // Log outgoing message in messages table
        if (conv) {
          try {
            let replyPreview = ""
            if (typeof content === "string") replyPreview = content
            else if (content.message) replyPreview = content.message
            else if (content.card) replyPreview = `[Card: ${content.card.title || "Sent"}]`
            else if (content.media?.url) replyPreview = `[Media: ${content.media.type || "image"}]`

            await supabase.from("messages").insert({
              id: `mid_reply_${Date.now()}_${Math.random()}`,
              conversation_id: conv.id,
              user_id: user.id,
              sender_id: connection.page_id,
              sender_username: user.username || "Page Bot",
              content: replyPreview || "[Automated Reply]",
              is_from_instagram: false,
              platform: "messenger",
            })
          } catch (e) {
            console.error("[fb-webhook] Failed to save outgoing message:", e)
          }
        }

        try {
          await supabase.from("automation_events").insert({
            user_id: user.id,
            automation_id: match.id,
            event_type: "sent",
            platform: "facebook",
            variant_id: variantId,
          })
        } catch (e) {
          console.error("[fb-webhook] Failed to log automation_event:", e)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
