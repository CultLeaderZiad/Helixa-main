export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession } from "@/lib/flows/session"
import { dmMessagingAllowed, commentToMessageAllowed } from "@/lib/tiktok/region"
import { mergeTikTokSettings, readTikTokSettings } from "@/lib/tiktok/settings"

/** Read or update TikTok welcome, default reply, suggested questions, and sign-up region. */
export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase
    .from("platform_connections")
    .select("id, page_id, metadata")
    .eq("user_id", session.userId)
    .eq("platform", "tiktok")
    .limit(20)
  if (error) return NextResponse.json({ error: "Could not load TikTok accounts" }, { status: 500 })
  const accounts = (data || []).map((row: { id: string; page_id: string; metadata: unknown }) => {
    const settings = readTikTokSettings(row.metadata)
    const dm = dmMessagingAllowed(settings.region)
    return {
      id: row.id,
      pageId: row.page_id,
      username: (row.metadata as { username?: string } | null)?.username || null,
      ...settings,
      dmAllowed: dm.allowed,
      dmReason: dm.reason,
      commentToMessage: commentToMessageAllowed(settings.region),
    }
  })
  return NextResponse.json({ accounts })
}

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => null)
  const pageId = typeof body?.pageId === "string" ? body.pageId : ""
  if (!pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 })
  const { data, error } = await session.supabase
    .from("platform_connections")
    .select("id, metadata")
    .eq("user_id", session.userId)
    .eq("platform", "tiktok")
    .eq("page_id", pageId)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: "TikTok account not found" }, { status: 404 })
  const metadata = mergeTikTokSettings(data.metadata, {
    region: body.region,
    welcome: body.welcome,
    defaultReply: body.defaultReply,
    suggestedQuestions: Array.isArray(body.suggestedQuestions) ? body.suggestedQuestions : undefined,
  })
  const saved = await session.supabase.from("platform_connections").update({ metadata }).eq("id", data.id)
  if (saved.error) return NextResponse.json({ error: "Could not save TikTok settings" }, { status: 500 })
  const settings = readTikTokSettings(metadata)
  return NextResponse.json({
    settings,
    dmAllowed: dmMessagingAllowed(settings.region).allowed,
    commentToMessage: commentToMessageAllowed(settings.region),
  })
}
