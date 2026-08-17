export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response

    const { id } = await params;
    const supabase = await getSupabaseBypassClient()
    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response

    const { id } = await params;
    const body = await request.json()
    const supabase = await getSupabaseBypassClient()

    // Can only edit if status is draft, scheduled, or failed
    const { data: existing, error: checkError } = await supabase
      .from("email_campaigns")
      .select("status")
      .eq("id", id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (existing.status !== "draft" && existing.status !== "scheduled" && existing.status !== "failed") {
      return NextResponse.json({ error: "Can only edit draft, scheduled or failed campaigns" }, { status: 400 })
    }

    const updatePayload: any = {}
    if (body.name !== undefined) updatePayload.name = body.name
    if (body.subject !== undefined) updatePayload.subject = body.subject
    if (body.preview_text !== undefined) updatePayload.preview_text = body.preview_text || null
    if (body.template !== undefined) updatePayload.template = body.template
    if (body.hero_image !== undefined) updatePayload.hero_image = body.hero_image || null
    if (body.heading !== undefined) updatePayload.heading = body.heading
    if (body.subheading !== undefined) updatePayload.subheading = body.subheading || null
    if (body.body_text !== undefined) updatePayload.body_text = body.body_text || null
    if (body.features !== undefined) updatePayload.features = body.features || []
    if (body.cta_text !== undefined) updatePayload.cta_text = body.cta_text || null
    if (body.cta_url !== undefined) updatePayload.cta_url = body.cta_url || null
    if (body.audience_filter !== undefined) updatePayload.audience_filter = body.audience_filter
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.scheduled_at !== undefined) updatePayload.scheduled_at = body.scheduled_at || null

    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[api/admin/campaigns/[id]] PATCH error:", error)
      return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err) {
    console.error("[api/admin/campaigns/[id]] Server error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response

    const { id } = await params;
    const supabase = await getSupabaseBypassClient()

    const { data: existing, error: checkError } = await supabase
      .from("email_campaigns")
      .select("status")
      .eq("id", id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (existing.status !== "draft") {
      return NextResponse.json({ error: "Can only delete draft campaigns" }, { status: 400 })
    }

    const { error } = await supabase
      .from("email_campaigns")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
