export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession } from "@/lib/flows/session"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { id } = await params
    const flow = await session.supabase.from("flows").select("id, draft_version_id").eq("id", id).eq("user_id", session.userId).maybeSingle()
    if (flow.error) throw flow.error
    if (!flow.data?.draft_version_id) return NextResponse.json({ error: "Nothing to publish" }, { status: 400 })
    const now = new Date().toISOString()
    await session.supabase.from("flow_versions").update({ published_at: now }).eq("id", flow.data.draft_version_id)
    const updated = await session.supabase
      .from("flows")
      .update({
        status: "live",
        published_version_id: flow.data.draft_version_id,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("id, status, published_version_id")
      .maybeSingle()
    if (updated.error) throw updated.error
    return NextResponse.json({ flow: updated.data })
  } catch (error) {
    console.error("[flows] publish", error)
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 })
  }
}
