export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession } from "@/lib/flows/session"
import { encryptString, decryptString } from "@/lib/crypto"
import { appendLeadRows, leadRow } from "@/lib/integrations/sync"

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  if (body.spreadsheetId || body.accessToken) {
    let secret = ""
    try {
      secret = encryptString(String(body.accessToken || ""))
    } catch {
      return NextResponse.json({ error: "BYOK_ENCRYPTION_SECRET is required" }, { status: 503 })
    }
    if (!body.accessToken) return NextResponse.json({ error: "accessToken is required" }, { status: 400 })
    const saved = await session.supabase.from("integration_configs").upsert({
      user_id: session.userId,
      workspace_id: session.workspaceId,
      kind: "sheets",
      config: { spreadsheetId: body.spreadsheetId, sheetName: body.sheetName || "Leads" },
      secret_ciphertext: secret,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,kind" })
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 })
    if (!body.export) return NextResponse.json({ ok: true })
  }
  const config = await session.supabase.from("integration_configs").select("config, secret_ciphertext").eq("user_id", session.userId).eq("kind", "sheets").maybeSingle()
  const token = config.data?.secret_ciphertext ? decryptString(config.data.secret_ciphertext) : null
  if (!token || !config.data?.config?.spreadsheetId) return NextResponse.json({ error: "Connect Google Sheets first" }, { status: 400 })
  const contacts = await session.supabase.from("contacts").select("display_name, username, email, phone, channel, tags, first_seen_at").eq("user_id", session.userId).limit(500)
  const leads = (contacts.data || []).filter((row: any) => row.email || row.phone).map(leadRow)
  const result = await appendLeadRows({
    spreadsheetId: config.data.config.spreadsheetId,
    sheetName: config.data.config.sheetName || "Leads",
    accessToken: token,
    rows: leads,
  })
  return NextResponse.json(result)
}
