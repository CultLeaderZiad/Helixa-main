export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession, isMissingTable } from "@/lib/flows/session"
import { nextReportAt } from "@/lib/agency/reports"

export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase.from("client_reports").select("*").eq("user_id", session.userId).order("created_at", { ascending: false })
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ reports: [], migration_required: true })
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 })
  }
  return NextResponse.json({ reports: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || "").trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "A recipient email is required" }, { status: 400 })
  const cadence = body.cadence === "monthly" ? "monthly" : "weekly"
  const format = body.format === "pdf" ? "pdf" : "link"
  const inserted = await session.supabase.from("client_reports").insert({
    workspace_id: session.workspaceId,
    user_id: session.userId,
    cadence,
    format,
    recipient_email: email,
    enabled: true,
    next_send_at: new Date(nextReportAt(cadence, Date.now())).toISOString(),
  }).select("id").maybeSingle()
  if (inserted.error) {
    if (isMissingTable(inserted.error)) return NextResponse.json({ error: "Run the phase 6 migration first" }, { status: 503 })
    return NextResponse.json({ error: inserted.error.message }, { status: 400 })
  }
  return NextResponse.json({ id: inserted.data?.id })
}
