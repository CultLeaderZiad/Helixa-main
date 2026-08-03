import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * Reads the Supabase Auth session, looks up the matching row in the
 * `accounts` table, and returns the full account record — including role, plan, trial_ends_at.
 *
 * Returns `null` when there is no valid session (missing cookie, expired, or
 * no matching account row).
 *
 * IMPORTANT: This function is the ONLY source of identity for authenticated
 * routes. Never trust userId / user_id from request body or query params.
 */
export async function getSessionUser(request?: NextRequest) {
  const supabase = await getSupabaseServerClient()

  // Fetch Supabase Auth user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  // Fetch full account record
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (accountError || !account) return null

  return account
}

/**
 * Gate for admin-only routes. Calls `getSessionUser` and returns a 403
 * response unless the user has `role === 'admin'`.
 *
 * Usage:
 * ```ts
 * const result = await requireAdmin(request)
 * if (result.response) return result.response  // 401 or 403
 * const account = result.user
 * ```
 */
export async function requireAdmin(request?: NextRequest): Promise<
  { user: any; response?: never } | { user?: never; response: NextResponse }
> {
  const account = await getSessionUser(request)
  if (!account) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  if (account.role !== "admin" || account.is_banned) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user: account }
}
