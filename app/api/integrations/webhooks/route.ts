export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession, isMissingTable } from "@/lib/flows/session"
import { encryptString } from "@/lib/crypto"
import { WEBHOOK_EVENTS } from "@/lib/integrations/webhooks"
import { isSafeWebhookUrl } from "@/lib/flows/graph"
import { randomBytes } from "crypto"

export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase.from("outgoing_webhook_endpoints").select("id, url, events, enabled, created_at").eq("user_id", session.userId)
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ endpoints: [], migration_required: true })
    return NextResponse.json({ error: "Failed to load webhooks" }, { status: 500 })
  }
  return NextResponse.json({ endpoints: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const url = String(body.url || "")
  if (!isSafeWebhookUrl(url)) return NextResponse.json({ error: "URL must be https on a public host" }, { status: 400 })
  const events = (Array.isArray(body.events) ? body.events : ["contact.created"]).map(String).filter((event: string) => (WEBHOOK_EVENTS as readonly string[]).includes(event))
  if (!events.length) return NextResponse.json({ error: "Pick at least one event" }, { status: 400 })
  const secret = `whsec_${randomBytes(18).toString("base64url")}`
  let stored = ""
  try {
    stored = encryptString(secret)
  } catch {
    return NextResponse.json({ error: "BYOK_ENCRYPTION_SECRET is required to store the signing secret" }, { status: 503 })
  }
  const inserted = await session.supabase.from("outgoing_webhook_endpoints").insert({
    workspace_id: session.workspaceId,
    user_id: session.userId,
    url,
    secret_ciphertext: stored,
    events,
    enabled: true,
  }).select("id").maybeSingle()
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 })
  return NextResponse.json({ id: inserted.data?.id, secret })
}
