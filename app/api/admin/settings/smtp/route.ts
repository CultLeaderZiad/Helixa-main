export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const supabase = await getSupabaseBypassClient()
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "smtp_settings")
      .maybeSingle()

    if (error) throw new Error(error.message)

    return NextResponse.json(data?.value || {})
  } catch (error: any) {
    console.error("[api/admin/settings/smtp] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req)
    if (adminCheck.response) return adminCheck.response

    const body = await req.json()
    const { host, port, secure, user, pass, fromName, fromEmail } = body

    const supabase = await getSupabaseBypassClient()
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { 
          key: "smtp_settings", 
          value: { host, port, secure, user, pass, fromName, fromEmail },
          updated_at: new Date().toISOString()
        },
        { onConflict: "key" }
      )

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[api/admin/settings/smtp] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
