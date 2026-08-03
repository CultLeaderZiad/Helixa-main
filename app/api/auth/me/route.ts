import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * GET /api/auth/me
 * Returns the current user's identity from the server-verified session.
 * Called by the frontend on mount (since the cookie is httpOnly).
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const supabase = await getSupabaseServerClient()
  
  // Try to find a connected Instagram user for this account
  const { data: igUser } = await supabase
    .from("users")
    .select("id, username, profile_picture_url")
    .eq("account_id", user.id)
    .single()

  return NextResponse.json({
    authenticated: true,
    accountId: user.id,
    userId: igUser?.id?.toString() || null, // Instagram user ID
    username: igUser?.username || user.email?.split('@')[0] || "User",
    profilePic: igUser?.profile_picture_url || null,
    plan: user.plan,
    trial_ends_at: user.trial_ends_at,
  })
}
