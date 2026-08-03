import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await getSupabaseServerClient()

  const { data: connections, error } = await supabase
    .from("platform_connections")
    .select("id, platform, platform_account_id, platform_account_username, created_at, updated_at")
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ connections })
}
