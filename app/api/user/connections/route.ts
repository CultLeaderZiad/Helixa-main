export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { forbidBelow, requireSessionUser } from "@/lib/auth"
import { instagramNeedsReconnect } from "@/lib/instagram-token"
import { isPlaceholderToken } from "@/lib/token-crypto"

export async function GET(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  const { user: account, igUser } = result

  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await getSupabaseBypassClient()

  const connections: any[] = []

  // Surface Instagram connection if real Instagram account is connected
  if (igUser && (igUser.business_account_id || igUser.page_id || (igUser.access_token && !isPlaceholderToken(igUser.access_token)))) {
    connections.push({
      id: `ig_${igUser.id}`,
      platform: "instagram",
      page_id: igUser.business_account_id?.toString() || igUser.page_id?.toString() || "",
      metadata: { username: igUser.username || `user_${account.id}` },
      created_at: igUser.created_at,
      reconnect_required: instagramNeedsReconnect(igUser),
    })
  }

  // Fetch platform connections (Facebook, Telegram, WhatsApp, Messenger).
  //
  // IMPORTANT: platform_connections.user_id is BIGINT (users.id). This used to
  // pass [users.id, account UUID] in ONE .in() filter, which made PostgREST
  // return 400 "invalid input syntax for type bigint" and silently dropped
  // EVERY connection — Facebook showed "Not connected" forever even though a
  // saved row existed. Query each key separately (and let one failure be
  // isolated + logged instead of wiping the whole list), then merge:
  //   1. rows keyed by the int64 users.id
  //   2. rows keyed by account_id (legacy/newer flows; see migration 58)
  const queries: PromiseLike<{ data: any[] | null; error: any }>[] = []
  if (igUser?.id) {
    queries.push(
      supabase
        .from("platform_connections")
        .select("id, platform, page_id, metadata, connected_at")
        .in("user_id", [igUser.id])
    )
  }
  if (result.workspace?.id) {
    queries.push(
      supabase
        .from("platform_connections")
        .select("id, platform, page_id, metadata, connected_at")
        .eq("workspace_id", result.workspace.id)
    )
  }

  const perIdResults = await Promise.all(queries)

  const seenIds = new Set<string>()
  const rawConnections = perIdResults.flatMap((r) => {
    if (r.error) {
      console.error("Error fetching platform connections:", r.error)
    }
    return (r.data || []).filter((row) => {
      if (seenIds.has(row.id)) return false
      seenIds.add(row.id)
      return true
    })
  })

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
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  const roleDenied = forbidBelow(result.user.workspace_role, "admin")
  if (roleDenied) return roleDenied
  const { user: account, igUser } = result

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

    // Only the active workspace's profile. Another client workspace on the
    // same login has its own users.id and must not be disconnected from here.
    const ownedUserIds = new Set<string>()
    if (igUser?.id) ownedUserIds.add(String(igUser.id))

    // Ownership check WITHOUT mixing the account UUID into a user_id filter:
    // user_id is BIGINT, and a combined .in([uuid, ...]) makes PostgREST
    // return 400 "invalid input syntax for type bigint", which broke every
    // disconnect attempt with "Failed to disconnect".
    const { data: row, error: rowError } = await supabase
      .from("platform_connections")
      .select("id, user_id")
      .eq("id", connectionId)
      .maybeSingle()

    if (rowError || !row || !ownedUserIds.has(String(row.user_id))) {
      return NextResponse.json({ error: "Connection not found or does not belong to your account" }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from("platform_connections")
      .delete()
      .eq("id", connectionId)

    if (deleteError) {
      console.error("Error disconnecting platform:", deleteError)
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
