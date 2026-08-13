export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const supabase = await getSupabaseServerClient()
    
    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single()

    if (!roleData || roleData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { status, admin_note } = body

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Update the inquiry
    const { error: updateError } = await supabase
      .from("enterprise_inquiries")
      .update({
        status,
        admin_note,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", params.id)

    if (updateError) throw updateError

    // Log the admin action
    await supabase.from("admin_audit_log").insert({
      admin_id: session.user.id,
      action: `enterprise_inquiry_${status}`,
      details: { inquiry_id: params.id, admin_note }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Admin enterprise update error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
