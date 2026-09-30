export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession } from "@/lib/flows/session"
import { importWebsite, saveKnowledge } from "@/lib/ai-agent/ingest"

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const imported = await importWebsite(String(body.url || ""))
  if ("error" in imported) return NextResponse.json({ error: imported.error }, { status: 400 })
  const saved = await saveKnowledge({
    supabase: session.supabase,
    userId: session.userId,
    workspaceId: session.workspaceId,
    kind: "website",
    title: imported.title,
    body: imported.body,
    sourceUrl: String(body.url),
  })
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 400 })
  return NextResponse.json(saved)
}
