import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const result = await requireInstagramUser(request)
  if (result.response) return result.response
  const { user: account, igUser } = result

  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await getSupabaseBypassClient()

  // Real platform_connections columns: id, user_id, platform, external_account_id,
  // access_token, is_active, connected_at, account_id
  const { data: rawConnections, error } = await supabase
    .from("platform_connections")
    .select("id, platform, external_account_id, is_active, connected_at")
    .eq("account_id", account.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map to the shape the frontend expects ({ id, platform, page_id, metadata, created_at })
  const connections = (rawConnections || []).map((c: any) => ({
    id: c.id,
    platform: c.platform,
    page_id: c.external_account_id,
    metadata: { name: c.external_account_id },
    created_at: c.connected_at,
  }))

  // The Instagram account lives in `users` (connected via OAuth), not in
  // platform_connections. Surface it so the UI reflects the real connection.
  if (igUser) {
    connections.unshift({
      id: `ig_${igUser.id}`,
      platform: "facebook", // the "Instagram & Facebook" card filters by facebook/messenger
      page_id: igUser.business_account_id?.toString() || igUser.page_id?.toString() || "",
      metadata: { name: igUser.username || `user_${igUser.id}` },
      created_at: igUser.created_at,
    })
  }

  return NextResponse.json({ connections })
}
