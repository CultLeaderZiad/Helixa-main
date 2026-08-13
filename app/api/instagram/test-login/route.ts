export const dynamic = 'force-dynamic'
import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

/**
 * POST /api/instagram/test-login
 * Creates a mock user for local development — no Instagram OAuth needed.
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 })
    }

    const TEST_USER_ID = "9999999999"
    const TEST_USERNAME = "test_creator"
    const EXPIRES_IN = 60 * 24 * 60 * 60 // 60 days in seconds

    const supabase = await getSupabaseBypassClient()

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: TEST_USER_ID,
          username: TEST_USERNAME,
          access_token: "TEST_TOKEN_NOT_REAL",
          token_expires_at: new Date(Date.now() + EXPIRES_IN * 1000).toISOString(),
          business_account_id: TEST_USER_ID,
          page_id: TEST_USER_ID,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )

    if (upsertError) {
      console.error("[test-login] Supabase upsert error:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Create server-verified session token
    const sessionToken = crypto.randomBytes(32).toString("hex")
    const sessionExpiresAt = new Date(Date.now() + EXPIRES_IN * 1000).toISOString()

    const { error: sessionError } = await supabase
      .from("sessions")
      .insert({
        user_id: TEST_USER_ID,
        session_token: sessionToken,
        expires_at: sessionExpiresAt,
      })

    if (sessionError) {
      console.error("[test-login] Session insert error:", sessionError)
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    const response = NextResponse.json({
      success: true,
      username: TEST_USERNAME,
      userId: TEST_USER_ID,
    })

    // Set opaque, httpOnly session cookie
    response.cookies.set("insta_session", sessionToken, {
      path: "/",
      maxAge: EXPIRES_IN,
      httpOnly: true,
      sameSite: "lax",
      secure: false, // dev only
    })

    return response
  } catch (error: any) {
    console.error("[test-login] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

