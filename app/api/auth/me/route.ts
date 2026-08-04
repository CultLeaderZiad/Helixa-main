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

  return NextResponse.json({
    authenticated: true,
    accountId: account.id,
    email: account.email || null,
    role: account.role || "customer",
    // The Instagram user id (int64) — this is the key for ALL business tables.
    userId: igUser?.id?.toString() || null,
    username: igUser?.username || account.email?.split("@")[0] || "User",
    profilePic: null, // `users` has no profile_picture_url column
    plan: igUser?.plan ?? account.plan,
    trial_ends_at: igUser?.trial_ends_at ?? account.trial_ends_at,
  })
}
