export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result.response) return result.response

  try {
    const supabase = await getSupabaseBypassClient()
    const { data: subscribers, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[admin/subscribers] GET error:", error)
      return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 })
    }

    return NextResponse.json({ subscribers })
  } catch (error: any) {
    console.error("[admin/subscribers] GET error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result.response) return result.response

  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[admin/subscribers] DELETE error:", error)
      return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[admin/subscribers] DELETE error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
