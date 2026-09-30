export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession } from "@/lib/flows/session"
import { encryptString } from "@/lib/crypto"

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const kind = body.provider === "stripe" ? "stripe" : body.provider === "paymob" ? "paymob" : body.provider === "tap" ? "tap" : null
  if (!kind) return NextResponse.json({ error: "provider must be paymob, stripe, or tap" }, { status: 400 })
  const secret = kind === "paymob"
    ? JSON.stringify({ apiKey: String(body.apiKey || ""), hmac: String(body.hmac || "") })
    : JSON.stringify({ secretKey: String(body.secretKey || ""), webhookSecret: String(body.webhookSecret || "") })
  let stored = ""
  try {
    stored = encryptString(secret)
  } catch {
    return NextResponse.json({ error: "BYOK_ENCRYPTION_SECRET is required to store gateway credentials" }, { status: 503 })
  }
  const config = kind === "paymob"
    ? { integration_id: String(body.integrationId || ""), iframe_id: String(body.iframeId || "") }
    : {}
  const saved = await session.supabase.from("integration_configs").upsert({
    user_id: session.userId,
    workspace_id: session.workspaceId,
    kind,
    config,
    secret_ciphertext: stored,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,kind" })
  if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
