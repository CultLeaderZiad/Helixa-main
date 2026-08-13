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

    // Can only edit if status is draft
    const { data: existing, error: checkError } = await supabase
      .from("email_campaigns")
      .select("status")
      .eq("id", id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (existing.status !== "draft") {
      return NextResponse.json({ error: "Can only edit draft campaigns" }, { status: 400 })
    }

    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .update({
        name: body.name,
        subject: body.subject,
        preview_text: body.preview_text || null,
        template: body.template,
        hero_image: body.hero_image || null,
        heading: body.heading,
        subheading: body.subheading || null,
        body_text: body.body_text || null,
        features: body.features || [],
        cta_text: body.cta_text || null,
        cta_url: body.cta_url || null,
        audience_filter: body.audience_filter,
      })
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
