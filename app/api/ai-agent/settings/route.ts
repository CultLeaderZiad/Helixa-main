export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession, isMissingTable } from "@/lib/flows/session"
import { settingsFromRow } from "@/lib/ai-agent/service"
import { DEFAULT_AGENT_SETTINGS } from "@/lib/ai-agent/guardrails"

export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase.from("ai_agent_settings").select("*").eq("user_id", session.userId).maybeSingle()
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ settings: DEFAULT_AGENT_SETTINGS, migration_required: true })
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
  return NextResponse.json({ settings: settingsFromRow(data) })
}

export async function PUT(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const tone = body.tone === "professional" || body.tone === "concise" ? body.tone : "friendly"
  const row = {
    user_id: session.userId,
    workspace_id: session.workspaceId,
    enabled: body.enabled !== false,
    persona_name: String(body.personaName || "Helixa").slice(0, 80),
    persona: String(body.persona || "").slice(0, 2000),
    tone,
    handoff_below: Math.min(0.95, Math.max(0.05, Number(body.handoffBelow ?? 0.45))),
    stay_on_topic: body.stayOnTopic !== false,
    qualify_fields: Array.isArray(body.qualifyFields) ? body.qualifyFields.map((field: unknown) => String(field)).slice(0, 12) : ["name", "phone", "email"],
    updated_at: new Date().toISOString(),
  }
  const saved = await session.supabase.from("ai_agent_settings").upsert(row, { onConflict: "user_id" }).select("*").maybeSingle()
  if (saved.error) {
    if (isMissingTable(saved.error)) return NextResponse.json({ error: "Run the phase 6 migration first" }, { status: 503 })
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
  return NextResponse.json({ settings: settingsFromRow(saved.data) })
}
