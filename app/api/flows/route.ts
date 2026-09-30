export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { blankGraph, triggerFromGraph, validateGraph } from "@/lib/flows/graph"
import { isMissingTable, workspaceSession } from "@/lib/flows/session"
import type { FlowGraph } from "@/lib/flows/types"

export async function GET(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { data, error } = await session.supabase
      .from("flows")
      .select("id, name, status, channel, trigger, updated_at, published_version_id, source_automation_id")
      .eq("user_id", session.userId)
      .order("updated_at", { ascending: false })
      .limit(100)
    if (error) {
      if (isMissingTable(error)) return NextResponse.json({ flows: [], migration_required: true })
      throw error
    }
    return NextResponse.json({ flows: data || [] })
  } catch (error) {
    console.error("[flows] GET", error)
    return NextResponse.json({ error: "Failed to load flows" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || "Untitled flow").slice(0, 120)
    const channel = String(body.channel || "instagram")
    const graph = (body.graph as FlowGraph) || blankGraph(channel)
    const errors = validateGraph(graph)
    if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 })
    const id = randomUUID()
    const versionId = randomUUID()
    const trigger = triggerFromGraph(graph)
    const created = await session.supabase.from("flows").insert({
      id,
      workspace_id: session.workspaceId,
      user_id: session.userId,
      name,
      status: "draft",
      channel,
      trigger,
      draft_version_id: versionId,
    }).select("id").maybeSingle()
    if (created.error) {
      if (isMissingTable(created.error)) return NextResponse.json({ error: "Run the phase 5 migration first" }, { status: 503 })
      throw created.error
    }
    const version = await session.supabase.from("flow_versions").insert({
      id: versionId,
      flow_id: id,
      version: 1,
      graph,
    })
    if (version.error) throw version.error
    return NextResponse.json({ id, version: 1 })
  } catch (error) {
    console.error("[flows] POST", error)
    return NextResponse.json({ error: "Failed to create flow" }, { status: 500 })
  }
}
