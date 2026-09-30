export const dynamic = "force-dynamic"

import { randomUUID } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { buildRefLink, pickWinners, slugify } from "@/lib/growth/tools"
import { isMissingTable, workspaceSession } from "@/lib/flows/session"

export async function GET(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const [bio, refs, giveaways] = await Promise.all([
      session.supabase.from("bio_pages").select("*").eq("user_id", session.userId).limit(10),
      session.supabase.from("ref_links").select("*").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(50),
      session.supabase.from("giveaways").select("*").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(50),
    ])
    const missing = [bio.error, refs.error, giveaways.error].some((error) => isMissingTable(error))
    if (missing) return NextResponse.json({ bio: null, refs: [], giveaways: [], migration_required: true })
    return NextResponse.json({ bio: bio.data?.[0] || null, refs: refs.data || [], giveaways: giveaways.data || [] })
  } catch (error) {
    console.error("[growth] GET", error)
    return NextResponse.json({ error: "Failed to load growth tools" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const body = await request.json()
    if (body.kind === "bio") {
      const title = String(body.title || "Link in bio").slice(0, 80)
      const slug = slugify(String(body.slug || title))
      const saved = await session.supabase.from("bio_pages").insert({
        id: randomUUID(),
        workspace_id: session.workspaceId,
        user_id: session.userId,
        slug,
        title,
        subtitle: body.subtitle ? String(body.subtitle).slice(0, 180) : null,
        collect_email: body.collectEmail !== false,
        collect_phone: body.collectPhone !== false,
        flow_id: body.flowId || null,
        locale: body.locale === "ar" ? "ar" : "en",
      }).select("*").maybeSingle()
      if (saved.error) {
        if (saved.error.code === "23505") return NextResponse.json({ error: "That link is already taken" }, { status: 409 })
        if (isMissingTable(saved.error)) return NextResponse.json({ error: "Run the phase 5 migration first" }, { status: 503 })
        throw saved.error
      }
      return NextResponse.json({ bio: saved.data })
    }
    if (body.kind === "ref") {
      const built = buildRefLink({
        channel: body.channel,
        handle: String(body.handle || ""),
        code: String(body.code || ""),
      })
      if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 })
      const saved = await session.supabase.from("ref_links").insert({
        id: randomUUID(),
        workspace_id: session.workspaceId,
        user_id: session.userId,
        channel: body.channel,
        handle: String(body.handle),
        code: built.code,
        flow_id: body.flowId || null,
        url: built.url,
      }).select("*").maybeSingle()
      if (saved.error) {
        if (saved.error.code === "23505") return NextResponse.json({ error: "That code already exists" }, { status: 409 })
        throw saved.error
      }
      const qr = await import("@/lib/growth/qr")
      const svg = await qr.qrSvg(built.url)
      return NextResponse.json({ ref: saved.data, svg })
    }
    if (body.kind === "giveaway") {
      const saved = await session.supabase.from("giveaways").insert({
        id: randomUUID(),
        workspace_id: session.workspaceId,
        user_id: session.userId,
        name: String(body.name || "Giveaway").slice(0, 80),
        keyword: String(body.keyword || "WIN").trim().slice(0, 40),
        channel: String(body.channel || "instagram"),
        media_id: body.mediaId ? String(body.mediaId) : null,
        winner_count: Math.min(50, Math.max(1, Number(body.winnerCount) || 1)),
        status: "open",
      }).select("*").maybeSingle()
      if (saved.error) throw saved.error
      return NextResponse.json({ giveaway: saved.data })
    }
    if (body.kind === "draw") {
      const giveaway = await session.supabase.from("giveaways").select("*").eq("id", body.giveawayId).eq("user_id", session.userId).maybeSingle()
      if (!giveaway.data) return NextResponse.json({ error: "Not found" }, { status: 404 })
      const entries = await session.supabase.from("giveaway_entries").select("contact_external_id").eq("giveaway_id", giveaway.data.id)
      const winners = pickWinners(
        (entries.data || []).map((row: { contact_external_id: string }) => row.contact_external_id),
        Number(giveaway.data.winner_count) || 1,
        String(body.seed || giveaway.data.id),
      )
      await session.supabase.from("giveaways").update({ winners, status: "drawn", drawn_at: new Date().toISOString() }).eq("id", giveaway.data.id)
      return NextResponse.json({ winners })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("[growth] POST", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
