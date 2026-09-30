export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { contactFromRow, normalizeCustomFields, normalizeTags } from "@/lib/contacts"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireSessionUser(request)
    if (result.response) return result.response
    const userId = result.igUser?.id
    if (!userId) return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    const { id } = await params
    const body = await request.json()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ("bot_paused" in body) patch.bot_paused = Boolean(body.bot_paused)
    if ("tags" in body) patch.tags = normalizeTags(body.tags)
    if ("custom_fields" in body) patch.custom_fields = normalizeCustomFields(body.custom_fields)
    if ("display_name" in body && typeof body.display_name === "string") patch.display_name = body.display_name.slice(0, 120)

    const supabase = await getSupabaseBypassClient()
    const { data, error } = await supabase
      .from("contacts")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    return NextResponse.json({ contact: contactFromRow(data) })
  } catch (error) {
    console.error("[contacts] PATCH", error)
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 })
  }
}
