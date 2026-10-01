export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSessionInstagramUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

// Limit max members
const MAX_SEATS = 5

export async function GET(request: NextRequest) {
  const session = await getSessionInstagramUser(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const agencyId = session.account.id

  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase
    .from("agency_team_members")
    .select("*")
    .eq("agency_account_id", agencyId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members: data, limit: MAX_SEATS })
}

export async function POST(request: NextRequest) {
  const session = await getSessionInstagramUser(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.account.permission_level !== "admin") {
    return NextResponse.json({ error: "Only admins can manage the team" }, { status: 403 })
  }

  const agencyId = session.account.id

  try {
    const { email, permission_level } = await request.json()
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    // Check seat limit (only active members count against seats — pending invites don't)
    const { count, error: countError } = await supabase
      .from("agency_team_members")
      .select("*", { count: "exact", head: true })
      .eq("agency_account_id", agencyId)
      .eq("status", "active")

    if (countError) throw countError
    if ((count || 0) >= MAX_SEATS) {
      return NextResponse.json({ error: `Seat limit reached (${MAX_SEATS} max)` }, { status: 403 })
    }

    // Check if member already exists (account lookup)
    const { data: memberAcc } = await supabase
      .from("accounts")
      .select("id")
      .eq("email", email)
      .single()

    // SECURITY: invites ALWAYS start as 'invited' (pending). Even when the invited
    // email already has an account, that account holder must explicitly accept
    // before their session ever switches into this agency's data — otherwise
    // inviting anyone's email would grant their account view access silently.
    const { data: newMember, error } = await supabase
      .from("agency_team_members")
      .insert({
        agency_account_id: agencyId,
        member_account_id: memberAcc?.id || null,
        email,
        status: 'invited',
        permission_level: permission_level || 'viewer'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: "User is already invited" }, { status: 409 })
      throw error
    }

    return NextResponse.json({ member: newMember })
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
  const session = await getSessionInstagramUser(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.account.permission_level !== "admin") {
    return NextResponse.json({ error: "Only admins can manage the team" }, { status: 403 })
  }

  const agencyId = session.account.id

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("id")

    if (!memberId) return NextResponse.json({ error: "Missing member ID" }, { status: 400 })

    const supabase = await getSupabaseBypassClient()
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
