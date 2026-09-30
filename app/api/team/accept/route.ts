export const dynamic = "force-dynamic"
import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

/**
 * POST /api/team/accept
 * Body: { id: string }
 * The invited account explicitly accepts a seat. Until this runs, status
 * stays `invited` and getSessionInstagramUser will not switch into the agency.
 */
export async function POST(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response

  const email = result.user.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: "Your account has no email address" }, { status: 400 })

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.id) return NextResponse.json({ error: "Missing invite id" }, { status: 400 })

  const supabase = await getSupabaseBypassClient()
  const { data: invite, error } = await supabase
    .from("agency_team_members")
    .select("id, email, status")
    .eq("id", body.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invite || invite.status !== "invited" || invite.email?.toLowerCase() !== email) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }

  const { data: updated, error: updateError } = await supabase
    .from("agency_team_members")
    .update({
      status: "active",
      member_account_id: result.user.id,
    })
    .eq("id", invite.id)
    .eq("status", "invited")
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ member: updated })
}
