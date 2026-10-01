export const dynamic = "force-dynamic"
import { type NextRequest, NextResponse } from "next/server"
import { forbidBelow, getSessionInstagramUser, loadWorkspaceContext } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { workspaceRoleFromLegacy, type WorkspaceRole } from "@/lib/workspace-access"
import { assertWithinLimit, limitPayload, PlanLimitError, resolveAccountPlan } from "@/lib/billing/enforce"
import { limitFor } from "@/lib/billing/plans"

export async function GET(request: NextRequest) {
  const session = await loadWorkspaceContext(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.denied) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = await getSupabaseBypassClient()
  const plan = await resolveAccountPlan(supabase, session.account)
  const seatLimit = limitFor(plan, "seats")
  if (session.workspace) {
    const members = await listWorkspaceMembers(supabase, session.workspace.id)
    if (members) {
      return NextResponse.json({ members, limit: seatLimit < 0 ? null : seatLimit, workspaceId: session.workspace.id })
    }
  }

  const agencyId = session.workspace?.ownerAccountId || session.account.id
  const { data, error } = await supabase.from("agency_team_members").select("*").eq("agency_account_id", agencyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data, limit: seatLimit < 0 ? null : seatLimit })
}

export async function POST(request: NextRequest) {
  const session = await loadWorkspaceContext(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.denied) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const roleDenied = forbidBelow(session.account.workspace_role, "admin")
  if (roleDenied) return roleDenied

  const agencyId = session.workspace?.ownerAccountId || session.account.id
  const workspaceId = session.workspace?.id || null

  try {
    const { email, permission_level } = await request.json()
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    const role = workspaceRoleFromLegacy(permission_level)
    if (role === "owner") {
      return NextResponse.json({ error: "The owner role cannot be invited" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    try {
      await assertWithinLimit(supabase, session.account, "seats", 1, workspaceId)
    } catch (error) {
      if (error instanceof PlanLimitError) return NextResponse.json(limitPayload(error), { status: 402 })
      throw error
    }

    const { data: memberAcc } = await supabase.from("accounts").select("id").eq("email", email).maybeSingle()

    const row: Record<string, unknown> = {
      agency_account_id: agencyId,
      member_account_id: memberAcc?.id || null,
      email,
      status: "invited",
      permission_level: role,
    }
    if (workspaceId) row.workspace_id = workspaceId

    let inserted = await supabase.from("agency_team_members").insert(row).select().single()
    if (inserted.error && workspaceId && /workspace_id/i.test(inserted.error.message || "")) {
      delete row.workspace_id
      inserted = await supabase.from("agency_team_members").insert(row).select().single()
    }
    if (inserted.error) {
      if (inserted.error.code === "23505") return NextResponse.json({ error: "User is already invited" }, { status: 409 })
      throw inserted.error
    }

    return NextResponse.json({ member: inserted.data })
  } catch (err: any) {
    console.error("Team invite error", err)
    return NextResponse.json({ error: err.message || "Failed to invite" }, { status: 500 })
  }
}

/**
 * PUT /api/team — invited member accepts their invite.
 *
 * Authenticated via the CALLER's session; the route matches the pending invite by
 * the caller's account email (or an explicit invite id owned by the caller) and
 * flips it to 'active', linking member_account_id. Nobody's session picks up
 * agency data until this acceptance happens.
 */
export async function PUT(request: NextRequest) {
  const session = await getSessionInstagramUser(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { inviteId, action } = await request.json()
    if (action !== "accept") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
    }
    if (!inviteId) {
      return NextResponse.json({ error: "Missing inviteId" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()

    // Fetch the pending invite
    const { data: invite, error: fetchError } = await supabase
      .from("agency_team_members")
      .select("id, agency_account_id, email, member_account_id, status")
      .eq("id", inviteId)
      .eq("status", "invited")
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!invite) {
      return NextResponse.json({ error: "Invite not found or already handled" }, { status: 404 })
    }

    // Only the invited person may accept — match by their authenticated email.
    const callerEmail = session.account.email?.toLowerCase()
    if (!callerEmail || callerEmail !== invite.email.toLowerCase()) {
      return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from("agency_team_members")
      .update({ status: "active", member_account_id: session.account.id })
      .eq("id", invite.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, agency_account_id: invite.agency_account_id })
  } catch (err: any) {
    console.error("Team accept error", err)
    return NextResponse.json({ error: err.message || "Failed to accept invite" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await loadWorkspaceContext(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.denied) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const roleDenied = forbidBelow(session.account.workspace_role, "admin")
  if (roleDenied) return roleDenied

  const agencyId = session.workspace?.ownerAccountId || session.account.id

  try {
    const memberId = new URL(request.url).searchParams.get("id")
    if (!memberId) return NextResponse.json({ error: "Missing member ID" }, { status: 400 })

    const supabase = await getSupabaseBypassClient()
    if (memberId.includes(":") && session.workspace) {
      const [workspaceId, accountId] = memberId.split(":")
      if (workspaceId !== session.workspace.id || !accountId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("account_id", accountId)
        .maybeSingle()
      if (membership?.role === "owner") {
        return NextResponse.json({ error: "The workspace owner cannot be removed" }, { status: 403 })
      }
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("account_id", accountId)
      if (error) throw error
      await supabase
        .from("agency_team_members")
        .delete()
        .eq("member_account_id", accountId)
        .eq("agency_account_id", agencyId)
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from("agency_team_members")
      .delete()
      .eq("id", memberId)
      .eq("agency_account_id", agencyId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}

async function listWorkspaceMembers(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, account_id, role, created_at")
    .eq("workspace_id", workspaceId)
  if (error) {
    if (/schema cache|does not exist|Could not find/i.test(error.message || "")) return null
    throw error
  }
  const ids = (data || []).map((row: any) => row.account_id)
  const accounts = ids.length
    ? await supabase.from("accounts").select("id, email").in("id", ids)
    : { data: [] }
  const emailById = new Map((accounts.data || []).map((row: any) => [row.id, row.email]))
  const active = (data || []).map((row: any) => ({
    id: `${row.workspace_id}:${row.account_id}`,
    email: emailById.get(row.account_id) || "",
    permission_level: row.role as WorkspaceRole,
    role: row.role,
    status: "active",
  }))

  const pending = await supabase
    .from("agency_team_members")
    .select("id, email, permission_level, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "invited")
  const invited = pending.error ? [] : pending.data || []
  return [...active, ...invited]
}

async function countSeats(supabase: any, workspaceId: string | null, agencyId: string): Promise<number> {
  if (workspaceId) {
    const { count, error } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("role", "owner")
    if (!error && count !== null) {
      const pending = await supabase
        .from("agency_team_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "invited")
      return count + (pending.count || 0)
    }
  }
  const { count, error } = await supabase
    .from("agency_team_members")
    .select("*", { count: "exact", head: true })
    .eq("agency_account_id", agencyId)
  if (error) throw error
  return count || 0
}
