export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession } from "@/lib/flows/session"
import { encryptString, decryptString } from "@/lib/crypto"
import { leadRow, upsertHubspotContact } from "@/lib/integrations/sync"

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  if (body.accessToken) {
    let secret = ""
    try {
      secret = encryptString(String(body.accessToken))
    } catch {
      return NextResponse.json({ error: "BYOK_ENCRYPTION_SECRET is required" }, { status: 503 })
    }
    const saved = await session.supabase.from("integration_configs").upsert({
      user_id: session.userId,
      workspace_id: session.workspaceId,
      kind: "hubspot",
      config: {},
      secret_ciphertext: secret,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,kind" })
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 })
    if (!body.sync) return NextResponse.json({ ok: true })
  }
  const config = await session.supabase.from("integration_configs").select("secret_ciphertext").eq("user_id", session.userId).eq("kind", "hubspot").maybeSingle()
  const token = config.data?.secret_ciphertext ? decryptString(config.data.secret_ciphertext) : null
  if (!token) return NextResponse.json({ error: "Connect HubSpot first" }, { status: 400 })
  const contacts = await session.supabase.from("contacts").select("display_name, username, email, phone, channel, tags, first_seen_at").eq("user_id", session.userId).limit(100)
  let synced = 0
  for (const contact of contacts.data || []) {
    if (!contact.email) continue
    await upsertHubspotContact({ accessToken: token, contact: leadRow(contact) })
    synced += 1
  }
  return NextResponse.json({ synced })
}
