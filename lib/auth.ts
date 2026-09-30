import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient, getSupabaseBypassClient } from "@/lib/supabase-server"
import { openAccessToken } from "@/lib/token-crypto"
import { resolveTenantProfile } from "@/lib/tenant-user"

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

  // We MUST use a dedicated admin client to fetch the account record.
  // The SSR client enforces RLS (it sends the user's JWT). If the live DB's RLS 
  // policies are missing or broken, the user won't be able to read their own account.
  const adminSupabase = await createAdminClient()

  const { data: account, error: accountError } = await adminSupabase
    .from("accounts")
    .select("*")
    .eq("id", user.id)
    .single()

  if (accountError) {
    if (accountError.code === "PGRST116") {
      console.warn("[auth] No accounts row for user; auto-healing now.", {
        userId: user.id,
        email: user.email,
      })
      // Self-healing fallback: Create the account row manually if the DB trigger failed
      const fallbackEmail = user.email || `no-email-${user.id}@helixa.app`
      const { data: newAccount, error: insertError } = await adminSupabase.from('accounts').insert({
        id: user.id,
        email: fallbackEmail,
        role: 'customer',
        plan: 'trial'
      }).select().single()

      if (insertError) {
        console.error("[auth] Failed to self-heal account for user:", user.id)
        console.error("[auth] Insert Error Details:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        })
        return null
      }
      return newAccount
    } else {
      console.error("[auth] Failed to load account:", {
        userId: user.id,
        email: user.email,
        code: accountError.code,
        message: accountError.message,
      })
    }
    return null
  }

  return account
}

/**
 * Creates the Supabase admin (service-role) client used for identity lookups.
 * The SSR client enforces RLS; if RLS policies are missing/broken the user
 * couldn't read their own rows, so identity reads MUST go through this client.
 */
async function createAdminClient() {
  // Reuse the bypass client which is already a service-role client
  return getSupabaseBypassClient()
}

/**
 * Returns the authenticated session plus the connected Instagram `users` row.
 *
 * IMPORTANT: `accounts.id` is the Supabase Auth uuid; business tables
 * (`automations`, `conversations`, `messages`, `ice_breakers`, `ai_usage_log`,
 * `subscriptions`, `payment_submissions`, `automation_events`) all key by the
 * int64 `users.id` (the Instagram user id). Callers MUST use `igUser.id` for
 * `user_id` filters/inserts, and `igUser.access_token` for Instagram API calls.
 *
 * Returns `null` when there is no session or no `users` row is linked to the
 * account (i.e. Instagram has not been connected yet).
 */
export async function getSessionInstagramUser(request?: NextRequest) {
  const account = await getSessionUser(request)
  if (!account) return null

  const adminSupabase = await createAdminClient()
  
  // More than one accepted membership used to make maybeSingle() error and
  // drop the user onto their own empty account. Pick the oldest active one.
  let teamQuery = await adminSupabase
    .from("agency_team_members")
    .select("agency_account_id, permission_level")
    .eq("member_account_id", account.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
  if (teamQuery.error && /created_at/i.test(teamQuery.error.message || "")) {
    teamQuery = await adminSupabase
      .from("agency_team_members")
      .select("agency_account_id, permission_level")
      .eq("member_account_id", account.id)
      .eq("status", "active")
      .limit(1)
  }
  const teamMember = teamQuery.data?.[0]

  const lookupAccountId = teamMember ? teamMember.agency_account_id : account.id

  let igUser: any = null
  try {
    igUser = await resolveTenantProfile(adminSupabase, lookupAccountId)
  } catch (error: any) {
    console.error("[auth] Failed to load instagram user:", {
      accountId: lookupAccountId,
      message: error?.message,
    })
    return null
  }

  // Attach permission info to the account object for the frontend/API
  // Clone the object first because Next.js fetch cache might freeze the Supabase response object
  const clonedAccount = { ...account }
  if (teamMember) {
    clonedAccount.is_team_member = true
    clonedAccount.agency_account_id = teamMember.agency_account_id
    clonedAccount.permission_level = teamMember.permission_level
  } else {
    clonedAccount.is_team_member = false
    clonedAccount.permission_level = "admin" // The owner of the account
  }

  return { account: clonedAccount, igUser: withPlainAccessToken(igUser) }
}

function withPlainAccessToken(igUser: any) {
  if (!igUser?.access_token) return igUser
  try {
    return { ...igUser, access_token: openAccessToken(igUser.access_token) }
  } catch (error) {
    console.error("[auth] Could not decrypt Instagram access token:", error)
    return { ...igUser, access_token: null, reconnect_required: true }
  }
}

/**
 * Gate for Instagram-scoped routes. Calls `getSessionInstagramUser` and
 * returns a 401 when unauthenticated or a 400 "Connect Instagram first" when
 * the session has no linked `users` row.
 *
 * Usage:
 * ```ts
 * const result = await requireInstagramUser(request)
 * if (result.response) return result.response
 * const igUserId = result.igUser.id  // int64 — use for all business-table queries
 * const accessToken = result.igUser.access_token
 * ```
 */
export async function requireInstagramUser(request?: NextRequest): Promise<
  { user: any; igUser: any; response?: never } | { user?: never; response: NextResponse }
> {
  const session = await getSessionInstagramUser(request)
  if (!session) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  if (session.account.is_banned) {
    return { response: NextResponse.json({ error: "Account is banned", isBanned: true }, { status: 403 }) }
  }
  if (!session.igUser) {
    return { response: NextResponse.json({ error: "Connect Instagram first" }, { status: 400 }) }
  }
  return { user: session.account, igUser: session.igUser }
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

/**
 * Gate for authenticated routes. Calls `getSessionUser` and returns a 401
 * when unauthenticated, or a 403 when the user is banned.
 *
 * Usage:
 * ```ts
 * const result = await requireUser(request)
 * if (result.response) return result.response
 * const account = result.user
 * ```
 */
export async function requireUser(request?: NextRequest): Promise<
  { user: any; response?: never } | { user?: never; response: NextResponse }
> {
  const account = await getSessionUser(request)
  if (!account) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  if (account.is_banned) {
    return { response: NextResponse.json({ error: "Account is banned", isBanned: true }, { status: 403 }) }
  }
  return { user: account }
}

/**
 * Multi-platform auth gate. Returns the authenticated session plus the
 * linked Instagram `users` row (if it exists), WITHOUT requiring it.
 *
 * Use this for routes that should work for ALL connected platforms
 * (Facebook, Telegram, WhatsApp) but may also need Instagram data.
 *
 * Business tables key by `igUser.id` (int64). If igUser is null, the
 * route should fall back to platform_connections or return gracefully.
 */
export async function requireSessionUser(request?: NextRequest): Promise<
  { user: any; igUser: any | null; response?: never } | { user?: never; igUser?: never; response: NextResponse }
> {
  const session = await getSessionInstagramUser(request)
  if (!session) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  if (session.account.is_banned) {
    return { response: NextResponse.json({ error: "Account is banned", isBanned: true }, { status: 403 }) }
  }
  // igUser may be null if Instagram is not connected — that's OK
  return { user: session.account, igUser: session.igUser || null }
}
