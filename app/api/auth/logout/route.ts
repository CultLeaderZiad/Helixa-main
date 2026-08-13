export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * POST /api/auth/logout
 * Deletes the session row and clears the session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    await supabase.auth.signOut()
  } catch (e) {
    console.error("[auth/logout] Failed to delete session:", e)
  }

  const response = NextResponse.json({ success: true })
  // Also clear the legacy cookie just in case
  response.cookies.set("insta_session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}

