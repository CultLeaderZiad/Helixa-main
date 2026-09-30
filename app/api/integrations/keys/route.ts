export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession, isMissingTable } from "@/lib/flows/session"
import { generateApiKey } from "@/lib/integrations/webhooks"
import { accountIdForProfile, assertFeature, limitPayload, loadAccount, PlanLimitError } from "@/lib/billing/enforce"

export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase.from("workspace_api_keys").select("id, name, prefix, created_at, last_used_at").eq("user_id", session.userId)
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ keys: [], migration_required: true })
    return NextResponse.json({ error: "Failed to load keys" }, { status: 500 })
  }
  return NextResponse.json({ keys: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const accountId = await accountIdForProfile(session.supabase, session.userId)
  const account = accountId ? await loadAccount(session.supabase, accountId) : null
  if (account) {
    try {
      await assertFeature(session.supabase, account, "apiAccess")
    } catch (error) {
      if (error instanceof PlanLimitError) return NextResponse.json(limitPayload(error), { status: 402 })
      throw error
    }
  }
  const created = generateApiKey()
  const inserted = await session.supabase.from("workspace_api_keys").insert({
    workspace_id: session.workspaceId,
    user_id: session.userId,
    name: String(body.name || "n8n").slice(0, 60),
    prefix: created.prefix,
    key_hash: created.hash,
  }).select("id, prefix").maybeSingle()
  if (inserted.error) {
    if (isMissingTable(inserted.error)) return NextResponse.json({ error: "Run the phase 6 migration first" }, { status: 503 })
    return NextResponse.json({ error: inserted.error.message }, { status: 400 })
  }
  return NextResponse.json({ id: inserted.data?.id, token: created.token, prefix: created.prefix })
}
