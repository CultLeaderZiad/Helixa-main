export const dynamic = 'force-dynamic'
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

  let rawConnections: any = []
  if (igUser) {
    const { data, error } = await supabase
      .from("platform_connections")
      .select("id, platform, page_id, metadata, connected_at")
      .eq("user_id", igUser.id)

    if (error) {
      console.error("Error fetching platform connections:", error)
    } else {
      rawConnections = data
    }
  }

  // Map to the shape the frontend expects ({ id, platform, page_id, metadata, created_at })
  const connections = (rawConnections || []).map((c: any) => ({
    id: c.id,
    platform: c.platform,
    page_id: c.page_id,
    metadata: c.metadata || { name: c.page_id },
    created_at: c.created_at,
  }))

  // The Instagram account lives in `users` (connected via OAuth), not in
  // platform_connections. Surface it so the UI reflects the real connection.
  if (igUser) {
    connections.unshift({
      id: `ig_${igUser.id}`,
      platform: "instagram", // It's an Instagram connection
      page_id: igUser.business_account_id?.toString() || igUser.page_id?.toString() || "",
      metadata: { username: igUser.username || `user_${igUser.id}` },
      created_at: igUser.created_at,
    })
  }

  return NextResponse.json({ connections })
}

export async function DELETE(request: NextRequest) {
  const result = await requireInstagramUser(request)
  if (result.response) return result.response
  const { user: account, igUser } = result

  if (!account || !igUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const platform = searchParams.get("platform")

    const supabase = await getSupabaseBypassClient()

    if (platform === "instagram") {
      // We don't allow disconnecting the primary Instagram account yet, as it breaks the user record.
      return NextResponse.json({ error: "Cannot disconnect primary account" }, { status: 400 })
    }

    if (id) {
      await supabase.from("platform_connections").delete().eq("id", id).eq("user_id", igUser.id)
    } else if (platform) {
      await supabase.from("platform_connections").delete().eq("platform", platform).eq("user_id", igUser.id)
    } else {
      return NextResponse.json({ error: "Missing id or platform" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting connection:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

