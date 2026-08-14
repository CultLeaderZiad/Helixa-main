export const dynamic = 'force-dynamic'
/* @ts-nocheck */

import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { processLeadCapture } from "@/lib/lead-capture"
import {
  sendTextDM,
  sendCardDM,
  sendMediaDM,
  sendSenderAction,
  replyToComment,
  fetchProfile,
  verifyIdOwnership,
  sleep,
} from "@/lib/instagram-api"

const WEBHOOK_VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
// Meta signs every webhook POST with HMAC-SHA256 of the raw body. Depending on app setup the
// signing key is the Instagram app secret or the parent Meta app secret, so accept either.
const APP_SECRETS = [process.env.INSTAGRAM_APP_SECRET, process.env.META_APP_SECRET].filter(
  (s): s is string => Boolean(s),
)

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (APP_SECRETS.length === 0 || !signatureHeader?.startsWith("sha256=")) return false
  const received = signatureHeader.slice("sha256=".length)
  return APP_SECRETS.some((secret) => {
    const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
    return (
      received.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"))
    )
  })
}

const DEFAULT_PUBLIC_REPLIES = ["Check your DMs! 📥", "Sent! 🔥", "Check inbox! ✨"]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && WEBHOOK_VERIFY_TOKEN && token === WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Invalid token" }, { status: 403 })
}

// ============================================================
// Content parsing — response_content may be object or JSON string
// ============================================================
function parseContent(raw: any) {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return { message: raw }
    }
  }
  return raw
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickVariant(rule: any): { content: any, variantId: string | null } {
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
  return { content: responseContent, variantId }
}

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

// ============================================================
// Unified response sender — handles text, card, media, quick
// replies, typing indicators, and human-like delays.
// ============================================================
async function sendAutomationResponse(
  token: string,
  recipient: { id?: string; comment_id?: string },
  content: any,
  opts: { skipTyping?: boolean; automationId?: string; variantId?: string | null } = {},
) {
  const delaySeconds = Number(content.delay_seconds) || 0
  const useTyping = content.typing_indicator === true && recipient.id && !opts.skipTyping

  if (useTyping) await sendSenderAction(token, recipient.id!, "typing_on")
  if (delaySeconds > 0) await sleep(delaySeconds * 1000)

  let result
  if (recipient.comment_id) {
    // Private replies via comment_id only support plain text
    // If it's a card, we send a Quick Reply to trigger the actual card since Instagram forbids templates here
    if (content.card && Array.isArray(content.card.buttons) && content.card.buttons.length > 0 && opts.automationId) {
        const text = content.message || content.card.title || "I have a link for you!"
        const qrTitle = content.card.buttons[0]?.title || "Show link"
        const qr = [{
            title: qrTitle,
            payload: `SYS_CARD_${opts.automationId}_${opts.variantId || 'default'}`
        }]
        result = await sendTextDM(token, recipient, text, qr)
    } else {
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
        
        result = await sendTextDM(token, recipient, text)
    }
  } else {
    const quickReplies = Array.isArray(content.quick_replies)
      ? content.quick_replies
          .filter((q: any) => q?.title)
          .map((q: any) => ({ title: q.title, payload: q.payload || `QR_${q.title.toUpperCase().replace(/\s+/g, "_")}` }))
      : undefined

    if (content.media?.url) {
      result = await sendMediaDM(token, recipient, content.media.type || "image", content.media.url)
      if (result.ok && content.message) {
        result = await sendTextDM(token, recipient, content.message, quickReplies)
      }
    } else if (content.card) {
      result = await sendCardDM(token, recipient, content.card)
    } else if (content.message) {
      result = await sendTextDM(token, recipient, content.message, quickReplies)
    } else {
      result = { ok: false, error: "empty content" }
    }
  }

  if (useTyping) await sendSenderAction(token, recipient.id!, "typing_off")
  return result
}

function responsePreviewText(content: any): string {
  if (content.message) return content.message
  if (content.card) return `[Card] ${content.card.title}`
  if (content.media?.url) return `[${content.media.type || "media"}]`
  return "[automation]"
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-hub-signature-256")
    if (!isValidSignature(rawBody, signature)) {
      // Hash prefixes are safe to log and let us tell a wrong secret from a mutated body.
      const computed = APP_SECRETS.map(
        (s, i) =>
          `${i === 0 ? "IG" : "META"}:${crypto.createHmac("sha256", s).update(rawBody, "utf8").digest("hex").slice(0, 12)}`,
      ).join(" ")
      console.error(
        `[webhook] 401: ${!signature ? "no x-hub-signature-256 header" : "signature mismatch"}; ` +
          `secrets configured: ${APP_SECRETS.length}; received=${signature?.slice(7, 19) ?? "-"} computed=[${computed}] bodyLen=${rawBody.length}`,
      )
      if (process.env.DISABLE_WEBHOOK_SIGNATURE_CHECK === "true") {
        console.warn("[webhook] SIGNATURE CHECK BYPASSED — remove DISABLE_WEBHOOK_SIGNATURE_CHECK after debugging")
      } else {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }
    const body = JSON.parse(rawBody)
    if (!body.entry) return NextResponse.json({ ok: true })
    const supabase = await getSupabaseBypassClient()

    if (body.object === "page") {
      const { handleFacebookWebhook } = await import("@/lib/facebook-webhook")
      return handleFacebookWebhook(body, supabase)
    }


    for (const entry of body.entry) {
      // Skip pure system events (echo / read / delivery)
      if (entry.messaging) {
        const isSystemEvent = entry.messaging.every(
          (event: any) => event.read || event.delivery || (event.message && event.message.is_echo),
        )
        if (isSystemEvent) continue
      }

      const webhookId = entry.id

      // ---------- User resolution: direct, payload fallback, token verify ----------
      let { data: user } = await supabase
        .from("users")
        .select("*")
        .or(`business_account_id.eq.${webhookId},page_id.eq.${webhookId}`)
        .single()

      if (!user) {
        const candidateIds = new Set<string>()
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.value?.media?.owner?.id) candidateIds.add(String(change.value.media.owner.id))
          }
        }
        if (entry.messaging) {
          for (const event of entry.messaging) {
            if (event.recipient?.id) candidateIds.add(String(event.recipient.id))
          }
        }
        for (const candidateId of candidateIds) {
          if (candidateId === webhookId) continue
          const { data: fallbackUser } = await supabase
            .from("users")
            .select("*")
            .or(`business_account_id.eq.${candidateId},page_id.eq.${candidateId}`)
            .single()
          if (fallbackUser) {
            await supabase.from("users").update({ page_id: webhookId }).eq("id", fallbackUser.id)
            user = fallbackUser
            break
          }
        }
      }

      if (!user) {
        const { data: allUsers } = await supabase.from("users").select("*")
        if (allUsers) {
          for (const candidate of allUsers) {
            if (!candidate.access_token) continue
            if (await verifyIdOwnership(candidate.access_token, webhookId)) {
              await supabase.from("users").update({ page_id: webhookId }).eq("id", candidate.id)
              user = candidate
              break
            }
          }
        }
      }

      if (!user) {
        console.log(`[webhook] ❌ Could not resolve user for ID ${webhookId}`)
        continue
      }

      const { data: automations } = await supabase
        .from("automations")
        .select("*, automation_variants(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .or("platform.eq.instagram,platform.is.null")

      if (!automations?.length) continue

      // Fetch the linked account to perform entitlement and ban checks
      if (!user.account_id) {
        console.log(`[webhook] ⚠️ User ${user.username} has no linked account. Skipping automations.`)
        continue
      }

      const { data: account } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", user.account_id)
        .single()

      if (!account) {
        console.log(`[webhook] ⚠️ Account not found for user ${user.username}. Skipping automations.`)
        continue
      }

      if (account.is_banned) {
        console.log(`[webhook] 🛑 Account ${account.id} is banned. Skipping automations.`)
        continue
      }

      // Plan enforcement: check expired OR trial-past-end
      let effectivePlan = account.plan
      if (account.plan === "trial" && account.trial_ends_at && !account.trial_exempt) {
        const trialEnded = new Date(account.trial_ends_at) < new Date()
        if (trialEnded) {
          // On-the-fly: mark as expired so it's consistent in DB too
          effectivePlan = "expired"
          await supabase
            .from("accounts")
            .update({ plan: "expired", updated_at: new Date().toISOString() })
            .eq("id", account.id)
          console.log(`[webhook] ⚠️ Account ${account.id} trial expired. Set plan=expired, skipping automations.`)
        }
      }
      
      if (effectivePlan === "expired") {
        console.log(`[webhook] ⚠️ Account ${account.id} plan is expired. Skipping automations.`)
        continue
      }

      // ============================================================
      //  PART A: COMMENTS
      // ============================================================
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field !== "comments" || !change.value?.text) continue

          const commentId = change.value.id
          const commentText = change.value.text.toLowerCase().trim()
          const senderId = change.value.from.id
          const mediaId = change.value.media.id
          const parentId = change.value.parent_id || null

          // Enforce 7-day eligibility window
          const eventTimeMs = (entry.time || Math.floor(Date.now() / 1000)) * 1000
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
          if (Date.now() - eventTimeMs > sevenDaysMs) {
            console.log(`[webhook] ⚠️ Comment ${commentId} is older than 7 days. Skipping private reply per Meta rules.`)
            continue
          }

          if (senderId === webhookId || senderId === user.business_account_id || senderId === user.page_id) continue

          const commentAutomations = automations.filter((a: any) => a.trigger_source === "comment")

          // Priority: specific post reply-all → specific post keyword → global keyword
          let match = commentAutomations.find(
            (a: any) => a.specific_media_id === mediaId && a.trigger_type === "reply_all",
          )
          if (!match) {
            match = commentAutomations.find(
              (a: any) =>
                a.specific_media_id === mediaId &&
                a.trigger_type === "keyword" &&
                keywordMatches(a.trigger_value, commentText),
            )
          }
          if (!match) {
            match = commentAutomations.find(
              (a: any) =>
                !a.specific_media_id &&
                a.trigger_type === "keyword" &&
                keywordMatches(a.trigger_value, commentText),
            )
          }
          if (!match) {
            match = commentAutomations.find(
              (a: any) =>
                !a.specific_media_id &&
                a.trigger_type === "reply_all",
            )
          }
          if (!match) continue

          const { content: rawContent, variantId } = pickVariant(match)
          const content = parseContent(rawContent)

          // Skip nested replies unless user opted in
          if (parentId && content.include_replies !== true) continue

          // Prevent duplicate private replies for the same comment
          const { data: alreadyReplied } = await supabase
            .from("automation_events")
            .select("id")
            .eq("comment_id", commentId)
            .eq("event_type", "comment_dm")
            .maybeSingle()

          if (alreadyReplied) {
            console.log(`[webhook] ⚠️ Already sent private reply for comment ${commentId}. Skipping to prevent Meta rejection.`)
            continue
          }

          console.log(`[webhook] ✅ Comment match: "${match.name}" (variant: ${variantId || "default"})`)

          // reply_mode: 'both' (default) | 'dm_only' | 'public_only'
          const replyMode = content.reply_mode || "both"

          if (replyMode !== "dm_only") {
            const pool =
              Array.isArray(content.public_replies) && content.public_replies.filter(Boolean).length > 0
                ? content.public_replies.filter(Boolean)
                : DEFAULT_PUBLIC_REPLIES
            await replyToComment(user.access_token, commentId, pickRandom(pool))
          }

          if (replyMode !== "public_only") {
            const leadCaptureResult = await processLeadCapture(
              supabase,
              user.id,
              senderId,
              "User", // realUsername is not easily available for comments
              user.access_token,
              commentText,
              match,
              content,
              commentId
            )

            if (!leadCaptureResult.shouldContinue) {
              // We just prompted them for lead capture info via Private Reply.
              // Note: We don't have a conv object yet, so we don't log to messages table until they reply.
            } else {
              await sendAutomationResponse(
                user.access_token,
                { comment_id: commentId },
                content,
                { skipTyping: true, automationId: match.id, variantId: variantId },
              )
            }
          }

          try {
            await supabase.from("automation_events").insert({
              user_id: user.id,
              automation_id: match.id,
              event_type: "comment_dm",
              recipient_id: senderId,
              platform: "instagram",
              variant_id: variantId,
              comment_id: commentId
            })
          } catch (e) {
            console.error("[webhook] Failed to log event", e)
          }
        }
      }

      // ============================================================
      //  PART A.5: STORY AUTOMATIONS (mention / reaction / reply)
      // ============================================================
      if (entry.messaging) {
        for (const event of entry.messaging) {
          const senderId = event.sender.id
          const recipientId = event.recipient.id
          if (event.read || event.delivery || event.message?.is_echo || senderId === recipientId) continue

          const storyAutomations = automations.filter((a: any) => a.trigger_source === "story")
          if (storyAutomations.length === 0) continue

          let match = null
          let storyMediaId: string | null = null

          if (event.message?.attachments?.[0]?.type === "story_mention") {
            storyMediaId = event.message.attachments[0].payload?.url || null
            match = storyAutomations.find(
              (a: any) => a.trigger_type === "mention" && (!a.specific_media_id || a.specific_media_id === storyMediaId),
            )
          } else if (event.reaction) {
            const reactionEmoji = event.reaction.emoji
            storyMediaId = event.reaction.mid || null
            match = storyAutomations.find((a: any) => {
              if (a.trigger_type !== "reaction") return false
              if (a.specific_media_id && a.specific_media_id !== storyMediaId) return false
              const triggers = a.trigger_value?.split(",").map((t: string) => t.trim()) || []
              if (triggers.length > 0 && triggers[0] !== "ALL" && triggers[0] !== "ALL_REACTIONS" && triggers[0] !== "") {
                return triggers.includes(reactionEmoji)
              }
              return true
            })
          } else if (event.message?.reply_to?.story) {
            const messageText = event.message.text || ""
            storyMediaId = event.message.reply_to.story.id || null
            match = storyAutomations.find((a: any) => {
              if (a.trigger_type !== "reply") return false
              if (a.specific_media_id && a.specific_media_id !== storyMediaId) return false
              const triggers = a.trigger_value?.split(",").map((t: string) => t.trim()) || []
              if (
                triggers.length > 0 &&
                triggers[0] !== "ALL" &&
                triggers[0] !== "ALL_MENTIONS" &&
                triggers[0] !== ""
              ) {
                return keywordMatches(a.trigger_value, messageText)
              }
              return true
            })
          }

          if (match) {
            console.log(`[webhook] ✨ Story match: "${match.name}"`)
            const { content: rawContent, variantId } = pickVariant(match)
            const content = parseContent(rawContent)
            const leadCaptureResult = await processLeadCapture(
              supabase,
              user.id,
              senderId,
              "User",
              user.access_token,
              event.message?.text || "",
              match,
              content
            )

            if (!leadCaptureResult.shouldContinue) {
              // We just prompted them for lead capture info.
            } else {
              await sendAutomationResponse(user.access_token, { id: senderId }, content)
            }
            try {
              await supabase.from("automation_events").insert({
                user_id: user.id,
                automation_id: match.id,
                event_type: "story_reply",
                recipient_id: senderId,
                platform: "instagram",
                variant_id: variantId
              })
            } catch (e) {}
          }
        }
      }

      // ============================================================
      //  PART B: DIRECT MESSAGES
      // ============================================================
      if (entry.messaging) {
        for (const event of entry.messaging) {
          if (event.read || event.delivery || event.reaction || event.message?.is_echo) continue

          const senderId = event.sender.id
          if (senderId === webhookId || senderId === user.business_account_id || senderId === user.page_id) continue

          let triggerType = ""
          let triggerValue = ""

          if (event.message?.quick_reply?.payload) {
            triggerType = "postback"
            triggerValue = event.message.quick_reply.payload
          } else if (event.message?.text) {
            triggerType = "keyword"
            triggerValue = event.message.text.toLowerCase().trim()
          } else if (event.postback?.payload) {
            triggerType = "postback"
            triggerValue = event.postback.payload
          } else {
            continue
          }

          console.log(`[webhook] 📩 DM from ${senderId}: "${triggerValue}"`)

          // ---------- Persist conversation + incoming message ----------
          let conv: any = null
          try {
            const { data: existing } = await supabase
              .from("conversations")
              .select("id, recipient_username")
              .eq("user_id", user.id)
              .eq("recipient_id", senderId)
              .single()

            if (!existing) {
              let realUsername = `cnt_${senderId.slice(0, 5)}...`
              const profile = await fetchProfile(user.access_token, senderId)
              if (profile?.username) realUsername = profile.username

              const { data: newConv } = await supabase
                .from("conversations")
                .insert({
                  user_id: user.id,
                  recipient_id: senderId,
                  recipient_username: realUsername,
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
                sender_username: "User",
                content: triggerValue,
                is_from_instagram: true,
              })
            }
          } catch (err) {
            console.error("[webhook] Failed to save incoming message", err)
          }

          // ---------- Match automation ----------
          const dmAutomations = automations.filter((a: any) => a.trigger_source === "dm" || !a.trigger_source)
          let match = null

          if (triggerType === "postback") {
            if (triggerValue.startsWith("UNLOCK_CONTENT_")) {
              const ruleId = triggerValue.replace("UNLOCK_CONTENT_", "")
              match = automations.find((a) => a.id === ruleId)
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
            } else if (triggerValue.startsWith("ICE_BREAKER_")) {
              const iceBreakerId = triggerValue.replace("ICE_BREAKER_", "")
              const { data: ib } = await supabase
                .from("ice_breakers")
                .select("*")
                .eq("id", iceBreakerId)
                .eq("user_id", user.id)
                .single()
              if (ib) {
                match = { name: "Ice Breaker: " + ib.question, response_content: { message: ib.response } }
              }
            } else {
              match = automations.find((a) => a.trigger_type === "postback" && a.trigger_value === triggerValue)
              // Quick reply payloads can also match keyword rules
              if (!match) {
                match = dmAutomations.find(
                  (a) => a.trigger_type === "keyword" && keywordMatches(a.trigger_value, triggerValue.toLowerCase()),
                )
              }
            }
          } else {
            const { data: ibMatches } = await supabase
              .from("ice_breakers")
              .select("*")
              .eq("user_id", user.id)
            
            const exactIb = ibMatches?.find(ib => ib.question.toLowerCase().trim() === triggerValue)
            if (exactIb) {
              match = { name: "Ice Breaker: " + exactIb.question, response_content: { message: exactIb.response } }
            } else {
              match = dmAutomations.find(
                (a) => a.trigger_type === "keyword" && keywordMatches(a.trigger_value, triggerValue),
              )
            }
          }

          let leadState: any = null
          if (!match) {
            // Check if user is in an active lead capture state even if there's no match
            const { data: dbLeadState } = await supabase
              .from("conversation_state")
              .select("*")
              .eq("user_id", user.id)
              .eq("ig_user_id", senderId)
              .single()
            leadState = dbLeadState
            if (leadState) {
              const activeAuto = automations.find((a: any) => a.id === leadState.automation_id)
              if (activeAuto) match = activeAuto
            }
          }

          if (!match) {
            if (user.ai_enabled) {
              try {
                const { generateGroqCompletion } = await import("@/lib/groq-client")
                const prompt = `You are a helpful AI assistant for an Instagram account named @${user.username}. 
Context/Instructions from account owner: ${user.ai_context || 'Be helpful, brief, and polite.'}
The user sent: "${triggerValue}"
Provide a very short, friendly response.`
                
                const aiReply = await generateGroqCompletion(user.id, "auto_reply", {
                  messages: [{ role: "system", content: prompt }]
                })
                
                if (aiReply) {
                  const content = { message: aiReply }
                  await sendAutomationResponse(user.access_token, { id: senderId }, content)
                  
                  if (conv) {
                    try {
                      await supabase.from("messages").insert({
                        id: `mid_ai_${Date.now()}_${Math.random()}`,
                        conversation_id: conv.id,
                        user_id: user.id,
                        sender_id: user.business_account_id,
                        sender_username: user.username,
                        content: aiReply,
                        is_from_instagram: false,
                      })
                    } catch (e) {}
                  }
                  
                  try {
                    await supabase.from("automation_events").insert({
                      user_id: user.id,
                      automation_id: "AI_AUTO_REPLY",
                      event_type: "dm_reply",
                      recipient_id: senderId,
                      platform: "instagram",
                    })
                  } catch (e) {}
                  
                  console.log(`[webhook] 🤖 AI Auto-reply sent to ${senderId}`)
                  continue
                }
              } catch (e) {
                console.error("[webhook] AI Auto-reply failed:", e)
              }
            }
            continue
          }

          const { content: rawContent, variantId } = pickVariant(match)
          console.log(`[webhook] ✅ DM match: "${match.name}" (variant: ${variantId || "default"})`)
          const content = parseContent(rawContent)

          // Follow gate
          const isUnlockEvent = triggerType === "postback" && triggerValue.startsWith("UNLOCK_CONTENT_")
          let result
          let replyTextLog = responsePreviewText(content)

          if (content.check_follow === true && !isUnlockEvent && !leadState) {
            replyTextLog = "[Locked Content Gate]"
            result = await sendCardDM(user.access_token, { id: senderId }, {
              title: "🔒 Content Locked",
              subtitle: `Please follow @${user.username} to see this!`,
              buttons: [
                { type: "web_url", url: `https://instagram.com/${user.username}`, title: "Follow Us" },
                { type: "postback", title: "I Followed! ✅", payload: `UNLOCK_CONTENT_${match.id}` },
              ],
            })
            
            if (result?.ok && conv) {
              try {
                await supabase.from("messages").insert({
                  id: `mid_reply_${Date.now()}_${Math.random()}`,
                  conversation_id: conv.id,
                  user_id: user.id,
                  sender_id: user.business_account_id,
                  sender_username: user.username,
                  content: replyTextLog,
                  is_from_instagram: false,
                })
              } catch (e) {
                console.error("[webhook] Failed to save outgoing message", e)
              }
            }
            continue // Stop processing this match until they click I Followed!
          }

          // ---------- Process Lead Capture State Machine ----------
          let realUsername = "User"
          if (conv && conv.recipient_username) realUsername = conv.recipient_username

          const leadCaptureResult = await processLeadCapture(
            supabase,
            user.id,
            senderId,
            realUsername,
            user.access_token,
            triggerValue,
            match,
            content
          )

          if (!leadCaptureResult.shouldContinue) {
             // We just prompted them for lead capture info. Save this outbound prompt to messages!
             if (conv && leadCaptureResult.replyTextLog) {
               try {
                 await supabase.from("messages").insert({
                   id: `mid_lead_${Date.now()}_${Math.random()}`,
                   conversation_id: conv.id,
                   user_id: user.id,
                   sender_id: user.business_account_id,
                   sender_username: user.username,
                   content: leadCaptureResult.replyTextLog,
                   is_from_instagram: false,
                 })
               } catch (e) {}
             }
             continue // Stop processing this match until they reply
          }

          // Mark message as seen for human-like flow
          if (content.mark_seen !== false) {
            await sendSenderAction(user.access_token, senderId, "mark_seen")
          }

          result = await sendAutomationResponse(user.access_token, { id: senderId }, content)
          
          try {
            await supabase.from("automation_events").insert({
              user_id: user.id,
              automation_id: match.id,
              event_type: "dm_reply",
              recipient_id: senderId,
              platform: "instagram",
              variant_id: variantId
            })
          } catch (e) {}

          if (result?.ok && conv) {
            try {
              await supabase.from("messages").insert({
                id: `mid_reply_${Date.now()}_${Math.random()}`,
                conversation_id: conv.id,
                user_id: user.id,
                sender_id: user.business_account_id,
                sender_username: user.username,
                content: replyTextLog, // Original responsePreviewText
                is_from_instagram: false,
              })
            } catch (e) {
              console.error("[webhook] Failed to save outgoing message", e)
            }
          }
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[webhook] Error", error)
    return NextResponse.json({ ok: true })
  }
}

