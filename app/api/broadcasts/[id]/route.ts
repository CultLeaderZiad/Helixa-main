export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { rollupBroadcast } from "@/lib/broadcasts/plan"
import { workspaceSession } from "@/lib/flows/session"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { id } = await params
    const broadcast = await session.supabase.from("broadcasts").select("*").eq("id", id).eq("user_id", session.userId).maybeSingle()
    if (!broadcast.data) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const recipients = await session.supabase.from("broadcast_recipients").select("status, skip_reason").eq("broadcast_id", id).limit(5000)
    const stats = rollupBroadcast((recipients.data || []).map((row: { status: string }) => row.status))
    return NextResponse.json({ broadcast: broadcast.data, stats, recipients: recipients.data || [] })
  } catch (error) {
    console.error("[broadcasts] GET id", error)
    return NextResponse.json({ error: "Failed to load broadcast" }, { status: 500 })
  }
}
