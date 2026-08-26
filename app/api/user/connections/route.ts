export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response
  const { user: account } = result

  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await getSupabaseBypassClient()

  // First, look up the linked Instagram user (if any)
  const { data: igUser } = await supabase
    .from("users")
    .select("id, business_account_id, page_id, username, created_at")
    .eq("account_id", account.id)
    .single()

  const connections: any[] = []

  // Surface Instagram connection if it exists
  if (igUser) {
    connections.push({
      id: `ig_${igUser.id}`,
      platform: "instagram",
      page_id: igUser.business_account_id?.toString() || igUser.page_id?.toString() || "",
      metadata: { username: igUser.username || `user_${account.id}` },
      created_at: igUser.created_at,
    })

    // Fetch platform connections (Facebook, Telegram, WhatsApp, Messenger)
    // These are keyed by igUser.id (the int64 Instagram user ID)
    const { data: rawConnections, error } = await supabase
      .from("platform_connections")
      .select("id, platform, page_id, metadata, connected_at")
      .eq("user_id", igUser.id)

    if (error) {
      console.error("Error fetching platform connections:", error)
    }

    for (const c of rawConnections || []) {
      connections.push({
        id: c.id,
        platform: c.platform,
        page_id: c.page_id,
        metadata: c.metadata || { name: c.page_id },
        created_at: c.connected_at,
      })
    }
  }

  return NextResponse.json({ connections })
}

export async function DELETE(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response
  const { user: account } = result

  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { connectionId, platform } = body

    if (!connectionId || !platform) {
      return NextResponse.json({ error: "Missing connectionId or platform" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()

    // For Instagram, we can't disconnect (it's the primary account)
    if (platform === "instagram") {
      return NextResponse.json({ error: "Cannot disconnect your primary Instagram account" }, { status: 400 })
    }

    // Look up igUser to get the correct user_id
    const { data: igUser } = await supabase
      .from("users")
      .select("id")
      .eq("account_id", account.id)
      .single()

    if (!igUser) {
      return NextResponse.json({ error: "Instagram account not found" }, { status: 400 })
    }

    // Delete from platform_connections using igUser.id
    const { error } = await supabase
      .from("platform_connections")
      .delete()
      .eq("id", connectionId)
      .eq("user_id", igUser.id)

    if (error) {
      console.error("Error disconnecting platform:", error)
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
