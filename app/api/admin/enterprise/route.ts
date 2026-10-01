export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  try {
    // Auth via the app's standard admin gate (accounts.role === 'admin').
    // The previous inline check queried a "user_roles" table that doesn't exist
    // in the schema, so this endpoint always failed closed with 500/403.
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const supabase = await getSupabaseBypassClient()

    const { data, error } = await supabase
      .from("enterprise_inquiries")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: any) {
    console.error("Admin enterprise inquiries error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

