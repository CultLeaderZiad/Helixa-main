export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { triggerFromGraph, validateGraph } from "@/lib/flows/graph"
import { isMissingTable, workspaceSession } from "@/lib/flows/session"
import type { FlowGraph } from "@/lib/flows/types"

async function loadOwned(supabase: any, userId: string | number, id: string) {
  const { data, error } = await supabase.from("flows").select("*").eq("id", id).eq("user_id", userId).maybeSingle()
  if (error) throw error
  return data
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { id } = await params
    const flow = await loadOwned(session.supabase, session.userId, id)
    if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const versions = await session.supabase
      .from("flow_versions")
      .select("id, version, graph, created_at, published_at")
      .eq("flow_id", id)
      .order("version", { ascending: false })
      .limit(20)
    const stats = await session.supabase.from("flow_node_stats").select("node_id, runs, clicks").eq("flow_id", id)
    const runs = await session.supabase
      .from("flow_runs")
      .select("status")
      .eq("flow_id", id)
      .limit(1000)
    const performance = { runs: 0, waiting: 0, completed: 0, clicks: 0 }
    for (const row of runs.data || []) {
      performance.runs += 1
      if (row.status === "waiting" || row.status === "paused") performance.waiting += 1
      if (row.status === "completed") performance.completed += 1
    }
    for (const row of stats.data || []) performance.clicks += Number(row.clicks) || 0
    return NextResponse.json({
      flow,
      versions: versions.data || [],
      stats: stats.data || [],
      performance,
    })
  } catch (error: any) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Run the phase 5 migration first" }, { status: 503 })
    console.error("[flows] id GET", error)
    return NextResponse.json({ error: "Failed to load flow" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { id } = await params
    const flow = await loadOwned(session.supabase, session.userId, id)
    if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const body = await request.json()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === "string") patch.name = body.name.slice(0, 120)
    if (typeof body.channel === "string") patch.channel = body.channel
    if (body.status === "paused" || body.status === "draft") patch.status = body.status
    let version = null
    if (body.graph) {
      const graph = body.graph as FlowGraph
      const errors = validateGraph(graph)
      if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 })
      const latest = await session.supabase
        .from("flow_versions")
        .select("version")
        .eq("flow_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()
      const next = Number(latest.data?.version || 0) + 1
      const versionId = randomUUID()
      const inserted = await session.supabase.from("flow_versions").insert({
        id: versionId,
        flow_id: id,
        version: next,
        graph,
      })
      if (inserted.error) throw inserted.error
      patch.draft_version_id = versionId
      patch.trigger = triggerFromGraph(graph)
      version = next
    }
    const updated = await session.supabase.from("flows").update(patch).eq("id", id).eq("user_id", session.userId).select("id, status, draft_version_id").maybeSingle()
    if (updated.error) throw updated.error
    return NextResponse.json({ flow: updated.data, version })
  } catch (error) {
    console.error("[flows] PATCH", error)
    return NextResponse.json({ error: "Failed to save flow" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { id } = await params
    const { error } = await session.supabase.from("flows").delete().eq("id", id).eq("user_id", session.userId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[flows] DELETE", error)
    return NextResponse.json({ error: "Failed to delete flow" }, { status: 500 })
  }
}
