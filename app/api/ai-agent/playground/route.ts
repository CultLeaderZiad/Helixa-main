export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession } from "@/lib/flows/session"
import { answerWithWorkspaceAgent } from "@/lib/ai-agent/service"

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const message = String(body.message || "").trim()
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
  const history = Array.isArray(body.history)
    ? body.history
        .filter((item: any) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
        .slice(-8)
    : []
  const decision = await answerWithWorkspaceAgent({
    supabase: session.supabase,
    userId: session.userId,
    workspaceId: session.workspaceId,
    accountId: null,
    message,
    history,
    playground: true,
    channel: "playground",
    contactExternalId: "playground",
  })
  if (!decision) return NextResponse.json({ error: "The agent is turned off" }, { status: 409 })
  return NextResponse.json({
    reply: decision.reply,
    dialect: decision.dialect,
    gulf: decision.gulf,
    arabizi: decision.arabizi,
    confidence: decision.confidence,
    handoff: decision.handoff,
    handoffReason: decision.handoffReason,
    sources: decision.sources,
    fields: decision.fields,
  })
}
