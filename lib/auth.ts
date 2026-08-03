import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * Reads the opaque `insta_session` cookie, looks up the matching row in the
 * `sessions` table (where token matches AND not expired), and returns the
 * full user record — including role, plan, trial_ends_at.
 *
 * Returns `null` when there is no valid session (missing cookie, expired, or
 * no matching session row).
 *
 * IMPORTANT: This function is the ONLY source of identity for authenticated
 * routes. Never trust userId / user_id from request body or query params.
 */
export async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get("insta_session")?.value
  if (!token) return null

  const supabase = await getSupabaseServerClient()

  // Look up session — must exist and not be expired
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("session_token", token)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (sessionError || !session) return null

  // Fetch full user record
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user_id)
    .single()

  if (userError || !user) return null

  return user
}

/**
 * Gate for admin-only routes. Calls `getSessionUser` and returns a 403
 * response unless the user has `role === 'admin'`.
 *
 * Usage:
 * ```ts
 * const result = await requireAdmin(request)
 * if (result.response) return result.response  // 401 or 403
 * const user = result.user
 * ```
 */
export async function requireAdmin(request: NextRequest): Promise<
  { user: any; response?: never } | { user?: never; response: NextResponse }
> {
  const user = await getSessionUser(request)
  if (!user) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  if (user.role !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user }
}
