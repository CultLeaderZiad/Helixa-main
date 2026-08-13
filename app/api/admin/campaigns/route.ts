export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response

    const supabase = await getSupabaseBypassClient()
    const { data: campaigns, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[api/admin/campaigns] GET error:", error)
      return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (err) {
    console.error("[api/admin/campaigns] Server error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result.response) return result.response
    const { user } = result

    const body = await request.json()
    const supabase = await getSupabaseBypassClient()

    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .insert({
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
        status: "draft",
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error("[api/admin/campaigns] POST error:", error)
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err) {
    console.error("[api/admin/campaigns] Server error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

