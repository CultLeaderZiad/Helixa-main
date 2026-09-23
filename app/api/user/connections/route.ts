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

  // First, look up the linked user row (if any)
  const { data: igUser } = await supabase
    .from("users")
    .select("id, business_account_id, page_id, username, created_at, access_token")
    .eq("account_id", account.id)
    .maybeSingle()

  const connections: any[] = []

  // Surface Instagram connection if real Instagram account is connected
  if (igUser && (igUser.business_account_id || igUser.page_id || (igUser.access_token && igUser.access_token !== "facebook_managed" && igUser.access_token !== "telegram_managed"))) {
    connections.push({
      id: `ig_${igUser.id}`,
      platform: "instagram",
      page_id: igUser.business_account_id?.toString() || igUser.page_id?.toString() || "",
      metadata: { username: igUser.username || `user_${account.id}` },
      created_at: igUser.created_at,
    })
  }

  // Fetch platform connections (Facebook, Telegram, WhatsApp, Messenger)
  const userIdsToQuery: any[] = []
  if (igUser?.id) userIdsToQuery.push(igUser.id)
  if (account.id) userIdsToQuery.push(account.id)

  const { data: rawConnections, error } = await supabase
    .from("platform_connections")
    .select("id, platform, page_id, metadata, connected_at")
    .in("user_id", userIdsToQuery)

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
    // Accept the connection id from EITHER the query string (?id=...) or the
    // JSON body ({ connectionId }). The connected-platforms page and the
    // platform detail page historically used different calling conventions,
    // which caused every disconnect to fail with "Missing connectionId".
    const queryId = request.nextUrl.searchParams.get("id")
    const queryPlatform = request.nextUrl.searchParams.get("platform")

    let body: { connectionId?: string; platform?: string } = {}
    try {
      body = await request.json()
    } catch {
      // No JSON body is fine when query params are used
    }

    const connectionId = body.connectionId || queryId
    const platform = body.platform || queryPlatform

    if (!connectionId) {
      return NextResponse.json({ error: "Missing connection id" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()

    // For Instagram, we can't disconnect (it's the primary account)
    if (platform === "instagram") {
      return NextResponse.json({ error: "Cannot disconnect your primary Instagram account" }, { status: 400 })
    }

    // Resolve ALL user ids owned by this account — connections can be keyed by
    // the int64 users.id (igUser) OR, in older flows, by the account UUID.
    const { data: ownedUsers } = await supabase
      .from("users")
      .select("id")
      .eq("account_id", account.id)

    const ownerIds: any[] = [account.id, ...(ownedUsers || []).map((u: any) => u.id)]

    // Delete only if the connection belongs to this account
    const { data: deleted, error } = await supabase
      .from("platform_connections")
      .delete()
      .eq("id", connectionId)
      .in("user_id", ownerIds)
      .select("id")

    if (error) {
      console.error("Error disconnecting platform:", error)
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: "Connection not found or does not belong to your account" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
