import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient, getSupabaseBypassClient } from "@/lib/supabase-server"
import { openAccessToken } from "@/lib/token-crypto"
import { resolveTenantProfile, resolveWorkspaceProfile } from "@/lib/tenant-user"
import {
  authorizeWorkspaceAction,
  legacyPermissionLevel,
  pickWorkspace,
  workspaceChoiceDenied,
  WORKSPACE_COOKIE,
  type WorkspaceRole,
} from "@/lib/workspace-access"
import { ensureDefaultWorkspace, listMemberships } from "@/lib/workspaces"

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

export interface LoadedWorkspace {
  id: string
  name: string
  role: WorkspaceRole
  ownerAccountId: string
}

export interface WorkspaceSession {
  account: any
  igUser: any | null
  workspace: LoadedWorkspace | null
  /** True when the caller named a workspace they are not a member of. */
  denied: boolean
  /** True when the phase 2 tables are not installed yet. The account is treated as owner. */
  legacy: boolean
}

function requestedWorkspaceId(request?: NextRequest): string | null {
  if (!request) return null
  const header = request.headers.get("x-helixa-workspace")?.trim()
  if (header) return header
  return null
}

function cookieWorkspaceId(request?: NextRequest): string | null {
  return request?.cookies.get(WORKSPACE_COOKIE)?.value?.trim() || null
}

/**
 * Resolves the signed-in account and the workspace they are acting in.
 *
 * Order: `x-helixa-workspace` header, then the `helixa_workspace` cookie,
 * then `accounts.active_workspace_id`, then a workspace they own. An owned
 * workspace is preferred over an invited one, so a person in more than one
 * agency is not pinned to the oldest seat. A header that names a workspace
 * they are not in is denied. A stale cookie is ignored.
 */
export async function loadWorkspaceContext(request?: NextRequest): Promise<WorkspaceSession | null> {
  const account = await getSessionUser(request)
  if (!account) return null

  const adminSupabase = await createAdminClient()
  let memberships = await listMemberships(adminSupabase, account.id)
  const legacy = memberships === null
  if (memberships && memberships.length === 0) {
    const created = await ensureDefaultWorkspace(adminSupabase, account)
    memberships = created ? await listMemberships(adminSupabase, account.id) : memberships
  }
  const choices = memberships || []

  const headerId = requestedWorkspaceId(request)
  if (headerId && !legacy && workspaceChoiceDenied(choices, headerId)) {
    return { account, igUser: null, workspace: null, denied: true, legacy: false }
  }

  const cookieId = cookieWorkspaceId(request)
  const requestedId =
    (headerId && choices.some((membership) => membership.workspaceId === headerId) ? headerId : null) ||
    (cookieId && choices.some((membership) => membership.workspaceId === cookieId) ? cookieId : null)

  const picked = legacy
    ? null
    : pickWorkspace(choices, { requestedId, activeId: account.active_workspace_id || null })

  let igUser: any = null
  try {
    if (picked) {
      igUser = await resolveWorkspaceProfile(adminSupabase, picked.workspaceId)
      if (!igUser) {
        igUser = await resolveTenantProfile(adminSupabase, picked.ownerAccountId, picked.workspaceId)
      }
    } else {
      igUser = await resolveTenantProfile(adminSupabase, account.id)
    }
  } catch (error: any) {
    console.error("[auth] Failed to load workspace profile:", {
      accountId: account.id,
      workspaceId: picked?.workspaceId,
      message: error?.message,
    })
    return null
  }

  const role: WorkspaceRole = picked?.role ?? "owner"
  const clonedAccount = { ...account }
  clonedAccount.workspace_id = picked?.workspaceId ?? null
  clonedAccount.workspace_name = picked?.name ?? null
  clonedAccount.workspace_role = role
  clonedAccount.permission_level = legacyPermissionLevel(role)
  clonedAccount.is_team_member = Boolean(picked && picked.role !== "owner")
  clonedAccount.agency_account_id = picked && picked.role !== "owner" ? picked.ownerAccountId : null

  const workspace: LoadedWorkspace | null = picked
    ? {
        id: picked.workspaceId,
        name: picked.name,
        role: picked.role,
        ownerAccountId: picked.ownerAccountId,
      }
    : null

  return { account: clonedAccount, igUser: withPlainAccessToken(igUser), workspace, denied: false, legacy }
}

/**
 * Returns the authenticated session plus the profile for the active workspace.
 * Business tables still key by `igUser.id`. Each workspace has its own profile,
 * so existing `user_id` filters stay inside that client.
 */
export async function getSessionInstagramUser(request?: NextRequest) {
  const session = await loadWorkspaceContext(request)
  if (!session || session.denied) return null
  return { account: session.account, igUser: session.igUser, workspace: session.workspace }
}

export function forbidBelow(role: WorkspaceRole | null | undefined, minimum: WorkspaceRole): NextResponse | null {
  if (authorizeWorkspaceAction({ role, minimum }) === "forbidden") {
    return NextResponse.json({ error: "Forbidden", requiredRole: minimum }, { status: 403 })
  }
  return null
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
  { user: any; igUser: any; workspace: LoadedWorkspace | null; response?: never } | { user?: never; response: NextResponse }
> {
  const session = await openWorkspaceSession(request)
  if (session.response) return { response: session.response }
  if (!session.igUser) {
    return { response: NextResponse.json({ error: "Connect Instagram first" }, { status: 400 }) }
  }
  return { user: session.account, igUser: session.igUser, workspace: session.workspace }
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
  { user: any; igUser: any | null; workspace: LoadedWorkspace | null; response?: never } | { user?: never; igUser?: never; response: NextResponse }
> {
  const session = await openWorkspaceSession(request)
  if (session.response) return { response: session.response }
  return { user: session.account, igUser: session.igUser || null, workspace: session.workspace }
}

async function openWorkspaceSession(request?: NextRequest): Promise<
  { account: any; igUser: any | null; workspace: LoadedWorkspace | null; response?: never } | { response: NextResponse }
> {
  const session = await loadWorkspaceContext(request)
  if (!session) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  if (session.denied) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  if (session.account.is_banned) {
    return { response: NextResponse.json({ error: "Account is banned", isBanned: true }, { status: 403 }) }
  }
  const decision = authorizeWorkspaceAction({
    role: session.account.workspace_role,
    method: request?.method,
  })
  if (!session.legacy && decision === "forbidden") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { account: session.account, igUser: session.igUser, workspace: session.workspace }
}
