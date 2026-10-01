export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params

    // Auth via the app's standard admin gate (accounts.role === 'admin').
    // The previous inline check queried a "user_roles" table that doesn't exist
    // in the schema, so this endpoint always failed closed with 500/403.
    const auth = await requireAdmin()
    if (auth.response) return auth.response
    const adminAccount = auth.user

    const body = await req.json()
    const { status, admin_note } = body

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()

    // Update the inquiry
    const { error: updateError } = await supabase
      .from("enterprise_inquiries")
      .update({
        status,
        admin_note,
        reviewed_by: adminAccount.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", params.id)

    if (updateError) throw updateError

    // Log the admin action
    await supabase.from("admin_audit_log").insert({
      admin_id: adminAccount.id,
      action: `enterprise_inquiry_${status}`,
      details: { inquiry_id: params.id, admin_note }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Admin enterprise update error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
