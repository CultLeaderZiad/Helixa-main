import { type NextRequest, NextResponse } from "next/server"
import { getSessionInstagramUser } from "@/lib/auth"

/**
 * GET /api/auth/me
 * Returns the current user's identity from the server-verified session.
 * Called by the frontend on mount (since the cookie is httpOnly).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionInstagramUser(request)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const { account, igUser } = session

  const userRole = account.role || "customer";
    
  // Default avatars based on role
  let defaultProfilePic = "/agency-avatar.png";
  if (userRole === "admin") {
    defaultProfilePic = "/admin-avatar.png";
  }

  return NextResponse.json({
    authenticated: true,
    accountId: account.id,
    email: account.email || null,
    role: account.role || "customer",
    // The Instagram user id (int64) — this is the key for ALL business tables.
    userId: igUser?.id?.toString() || null,
    username: (account as any).full_name || igUser?.username || account.email?.split("@")[0] || "User",
    profilePic: (account as any).profile_picture_url || defaultProfilePic,
    created_at: account.created_at,
    plan: igUser?.plan ?? account.plan,
    trial_ends_at: igUser?.trial_ends_at ?? account.trial_ends_at,
    trial_exempt: account.trial_exempt,
    permission_level: account.permission_level,
    is_team_member: account.is_team_member,
  })
}
