import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

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

  return NextResponse.json({
    authenticated: true,
    userId: user.id?.toString(),
    username: user.username,
    profilePic: user.profile_picture_url || null,
    plan: user.plan,
  })
}
