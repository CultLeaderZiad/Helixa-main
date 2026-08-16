import { NextResponse, NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "updates_page")
      .single()

    if (error || !data) {
      // Default to true if not set
      return NextResponse.json({ isEnabled: true })
    }

    return NextResponse.json(data.value)
  } catch (error) {
    return NextResponse.json({ isEnabled: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const body = await req.json()
    const { isEnabled } = body

    const supabase = await getSupabaseServerClient()
    const { error } = await supabase
      .from("app_settings")
      .upsert({
        key: "updates_page",
        value: { isEnabled: !!isEnabled },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

    if (error) {
      console.error("[api/settings/updates] POST error:", error)
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[api/settings/updates] Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
