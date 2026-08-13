export const dynamic = 'force-dynamic'
import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { sendWhatsAppText, markWhatsAppSeen } from "@/lib/whatsapp-api"

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
// WhatsApp uses the Meta App Secret for signature verification
const APP_SECRET = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET || !signatureHeader?.startsWith("sha256=")) return false
  const received = signatureHeader.slice("sha256=".length)
  const expected = crypto.createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex")
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"))
  )
}

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

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-hub-signature-256")

    if (!isValidSignature(rawBody, signature)) {
      if (process.env.DISABLE_WEBHOOK_SIGNATURE_CHECK !== "true") {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true })
    }

    const supabase = await getSupabaseServerClient()

    for (const entry of body.entry) {
      const waAccountId = entry.id
      if (!entry.changes) continue

      for (const change of entry.changes) {
        if (change.field !== "messages") continue
        
        const value = change.value
        const phoneNumberId = value.metadata?.phone_number_id
        
        if (!value.messages || !phoneNumberId) continue

        // User resolution via platform_connections
        const { data: connection } = await supabase
          .from("platform_connections")
          .select("user_id, platform, access_token, page_id")
          .eq("page_id", phoneNumberId)
          .eq("platform", "whatsapp")
          .single()

        if (!connection) {
          console.log(`[wa-webhook] ❌ Could not resolve WhatsApp Phone Number ID ${phoneNumberId}`)
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
          .eq("platform", "whatsapp")

        if (!automations?.length) continue

        // Plan enforcement
        const { data: account } = await supabase
          .from("accounts")
          .select("id, plan, trial_ends_at, trial_exempt")
          .eq("id", user.account_id)
          .single()

        if (!account) {
          console.log(`[wa-webhook] ⚠️ Account not found for user ${user.username}. Skipping.`)
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
            console.log(`[wa-webhook] ⚠️ Account ${account.id} trial expired. Set plan=expired, skipping automations.`)
          }
        }
        if (effectivePlan === "expired") {
          continue
        }

        const waToken = connection.access_token

        for (const message of value.messages) {
          const senderPhone = message.from
          const msgId = message.id
          
          await markWhatsAppSeen(phoneNumberId, waToken, msgId)

          let text = ""
          let isPostback = false

          if (message.type === "text") {
            text = message.text.body
          } else if (message.type === "interactive") {
            if (message.interactive.type === "button_reply") {
              text = message.interactive.button_reply.id
              isPostback = true
            } else if (message.interactive.type === "list_reply") {
              text = message.interactive.list_reply.id
              isPostback = true
            }
          }

          if (!text) continue

          for (const rule of automations) {
            let matched = false
            if (isPostback && rule.trigger_type === "postback" && rule.trigger_value === text) {
              matched = true
            } else if (!isPostback && rule.trigger_type === "keyword" && keywordMatches(rule.trigger_value, text)) {
              matched = true
            }

            if (matched) {
              console.log(`[wa-webhook] ✅ Match! rule=${rule.name} sender=${senderPhone}`)
              
              // A/B Testing selection
              let content = rule.response_content
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
                    content = opt.content
                    variantId = opt.id
                    break
                  }
                }
              }

              const quickReplies = Array.isArray(content.quick_replies)
                ? content.quick_replies
                    .filter((q: any) => q?.title)
                    .map((q: any) => ({ title: q.title, payload: q.payload || `QR_${q.title.toUpperCase().replace(/\s+/g, "_")}` }))
                : undefined

              if (content.message || content.reply_text) {
                const sendText = content.message || content.reply_text
                const result = await sendWhatsAppText(phoneNumberId, waToken, senderPhone, sendText, quickReplies)
                
                // If it fails because outside 24h window, log it
                if (!result.ok && result.error === "OUTSIDE_WINDOW") {
                  console.error(`[wa-webhook] ❌ Failed to send to ${senderPhone}: Outside 24h window (template required)`)
                  // Could optionally store this failure in automation_events
                }
              }

              try {
                await supabase.from("automation_events").insert({
                  user_id: user.id,
                  automation_id: rule.id,
                  event_type: "wa_reply",
                  recipient_id: senderPhone,
                  platform: "whatsapp",
                  variant_id: variantId
                })
              } catch (e) {
                console.error("[wa-webhook] Failed to log automation_event:", e)
              }
              break
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[wa-webhook] Server error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

