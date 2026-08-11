import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const body = await req.json()
    const { isActive, message, link } = body

    if (typeof isActive !== "boolean" || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { 
          key: "update_banner", 
          value: { isActive, message, link: link || "" },
          updated_at: new Date().toISOString()
        },
        { onConflict: "key" }
      )

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[api/admin/settings/banner] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
