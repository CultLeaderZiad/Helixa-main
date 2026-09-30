export const dynamic = "force-dynamic"

import { randomUUID } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { planAutomationMigration } from "@/lib/flows/migrate"
import { isMissingTable, workspaceSession } from "@/lib/flows/session"

export async function POST(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const rules = await session.supabase.from("automations").select("*").eq("user_id", session.userId)
    if (rules.error) throw rules.error
    const existing = await session.supabase.from("flows").select("source_automation_id").eq("user_id", session.userId).not("source_automation_id", "is", null)
    if (existing.error) {
      if (isMissingTable(existing.error)) return NextResponse.json({ error: "Run the phase 5 migration first" }, { status: 503 })
      throw existing.error
    }
    const migrated = new Set<string>((existing.data || []).map((row: { source_automation_id: string }) => row.source_automation_id))
    const planned = planAutomationMigration(rules.data || [], migrated)
    let created = 0
    for (const flow of planned) {
      const rule = (rules.data || []).find((item: { id: string }) => item.id === flow.sourceAutomationId)
      const id = randomUUID()
      const versionId = randomUUID()
      const live = rule?.is_active !== false
      const inserted = await session.supabase.from("flows").insert({
        id,
        workspace_id: session.workspaceId,
        user_id: session.userId,
        name: flow.name,
        status: live ? "live" : "paused",
        channel: flow.channel,
        trigger: flow.trigger,
        draft_version_id: versionId,
        published_version_id: live ? versionId : null,
        source_automation_id: flow.sourceAutomationId,
      })
      if (inserted.error) {
        if (inserted.error.code === "23505") continue
        throw inserted.error
      }
      await session.supabase.from("flow_versions").insert({
        id: versionId,
        flow_id: id,
        version: 1,
        graph: flow.graph,
        published_at: live ? new Date().toISOString() : null,
      })
      created += 1
    }
    return NextResponse.json({ created, skipped: migrated.size })
  } catch (error) {
    console.error("[flows] migrate", error)
    return NextResponse.json({ error: "Failed to migrate automations" }, { status: 500 })
  }
}
