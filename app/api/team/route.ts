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
    // Check seat limit
    const { count, error: countError } = await supabase
      .from("agency_team_members")
      .select("*", { count: "exact", head: true })
      .eq("agency_account_id", agencyId)

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

    const { data: newMember, error } = await supabase
      .from("agency_team_members")
      .insert({
        agency_account_id: agencyId,
        member_account_id: memberAcc?.id || null,
        email,
        status: memberAcc ? 'active' : 'invited',
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
