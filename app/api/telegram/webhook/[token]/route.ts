export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { openAccessToken } from "@/lib/token-crypto"

export { processTelegramUpdate } from "@/lib/channels/ingress"

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params
  const rawToken = resolvedParams.token
  if (!rawToken) {
    return NextResponse.json({ error: "No token provided" }, { status: 400 })
  }

  const botId = rawToken.split(":")[0]
  if (!botId) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 })
  }

  try {
    const supabase = await getSupabaseBypassClient()
    const { data: byPage, error: pageError } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("platform", "telegram")
      .eq("page_id", botId)
      .limit(1)
    let connection = byPage?.[0]
    let connError = pageError
    if (!connection && !connError) {
      const byExternal = await supabase
        .from("platform_connections")
        .select("*")
        .eq("platform", "telegram")
        .eq("external_account_id", botId)
        .limit(1)
      connection = byExternal.data?.[0]
      connError = byExternal.error
    }

    if (connError || !connection) {
      console.warn(`[Telegram Webhook] Unknown bot ID: ${botId}`)
      return NextResponse.json({ error: "Unknown bot" }, { status: 404 })
    }

    const storedToken = openAccessToken(connection.access_token)
    if (storedToken !== rawToken) {
      console.warn(`[Telegram Webhook] Token mismatch for bot ID: ${botId}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let update: unknown
    try {
      update = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { acceptInboundWebhook } = await import("@/lib/inbound-queue")
    const queued = await acceptInboundWebhook(supabase, "telegram", update, { botId })
    if (queued.fallback) {
      try {
        const { processTelegramUpdate } = await import("@/lib/channels/ingress")
        await processTelegramUpdate(supabase, botId, update)
      } catch (error) {
        console.error("[Telegram Webhook] Inline processing failed", error)
      }
    }
    return NextResponse.json({ ok: true, ...queued })
  } catch (error) {
    console.error("[Telegram Webhook] Failed to queue event", error)
    return NextResponse.json({ error: "queue_unavailable" }, { status: 500 })
  }
}
