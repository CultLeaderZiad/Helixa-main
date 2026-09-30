export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { isPublicHttpUrl } from "@/lib/channels/links"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!code || code.length > 64) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase.from("tracked_links").select("*").eq("code", code).maybeSingle()
  if (error || !data || !isPublicHttpUrl(data.destination_url)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const logged = await supabase.from("automation_events").insert({
    user_id: data.user_id,
    workspace_id: data.workspace_id,
    automation_id: data.automation_id,
    variant_id: data.variant_id,
    event_type: "link_click",
    platform: data.channel,
    recipient_id: data.contact_external_id,
  })
  if (logged.error) console.warn("[redirect] click was not logged:", logged.error.message)

  if (data.broadcast_id && data.contact_external_id) {
    await supabase
      .from("broadcast_recipients")
      .update({ status: "clicked", clicked_at: new Date().toISOString() })
      .eq("broadcast_id", data.broadcast_id)
      .eq("contact_external_id", data.contact_external_id)
  }

  return NextResponse.redirect(data.destination_url, 302)
}
