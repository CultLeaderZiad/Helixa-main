export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"

/**
 * GET /api/user/me
 * Returns the current authenticated user's public fields.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        plan: user.plan,
        role: user.role,
        trial_ends_at: user.trial_ends_at,
      },
    })
  } catch (error: any) {
    console.error("[user/me] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

