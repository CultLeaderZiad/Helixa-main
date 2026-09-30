export const dynamic = "force-dynamic"
import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

/**
 * GET /api/team/invites
 * Pending invitations addressed to the logged-in account. These do not grant
 * access until POST /api/team/accept.
 */
export async function GET(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response

  const email = result.user.email?.trim()
  if (!email) return NextResponse.json({ invites: [] })

  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase
    .from("agency_team_members")
    .select("id, email, permission_level, status, created_at, agency_account_id")
    .eq("status", "invited")
    .ilike("email", email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invites = (data || []).filter((row) => row.email?.toLowerCase() === email.toLowerCase())
  return NextResponse.json({ invites })
}
