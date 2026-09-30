export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession, isMissingTable } from "@/lib/flows/session"

export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase
    .from("ai_answer_logs")
    .select("id, question, answer, dialect, gulf, arabizi, confidence, handoff, handoff_reason, sources, channel, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(40)
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ logs: [], migration_required: true })
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 })
  }
  return NextResponse.json({ logs: data || [] })
}
