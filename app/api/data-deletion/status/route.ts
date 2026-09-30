export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

const CODE = /^hx_[a-f0-9]{18}$/

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() || ""
  if (!CODE.test(code)) return NextResponse.json({ status: "unknown" })
  try {
    const supabase = await getSupabaseBypassClient()
    const row = await supabase
      .from("data_deletion_requests")
      .select("status, provider, created_at, completed_at")
      .eq("confirmation_code", code)
      .maybeSingle()
    if (row.error || !row.data) return NextResponse.json({ status: "unknown" })
    return NextResponse.json({
      status: row.data.status,
      provider: row.data.provider,
      createdAt: row.data.created_at,
      completedAt: row.data.completed_at,
    })
  } catch {
    return NextResponse.json({ status: "unavailable" })
  }
}
