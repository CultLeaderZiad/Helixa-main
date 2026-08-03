import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result.response) {
    return result.response
  }

  const supabase = await getSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "pending"

  try {
    const { data: payments, error } = await supabase
      .from("payment_submissions")
      .select(`
        *,
        users (
          username,
          plan
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
