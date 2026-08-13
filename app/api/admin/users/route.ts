export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

/**
 * GET /api/admin/users
 * Admin-only: returns a paginated, filterable list of accounts (auth shell)
 * enriched with security flags from the linked users (int64) row.
 * Query params: role, plan, is_flagged, page (default 1), limit (default 50), search
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result.response) return result.response

  try {
    const supabase = await getSupabaseBypassClient()
    const { searchParams } = new URL(request.url)

    const role = searchParams.get("role")
    const plan = searchParams.get("plan")
    const isFlagged = searchParams.get("is_flagged")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
    const offset = (page - 1) * limit

    let query = supabase
      .from("accounts")
      .select(
        "id, email, role, plan, trial_ends_at, is_flagged, flagged_reason, is_banned, banned_reason, signup_ip, created_at, updated_at, users(ip_risk_score, vpn_suspected)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (role) query = query.eq("role", role)
    if (plan) query = query.eq("plan", plan)
    if (isFlagged !== null) query = query.eq("is_flagged", isFlagged === "true")
    if (search) query = query.ilike("email", `%${search}%`)

    const { data: accounts, error, count } = await query

    if (error) throw error

    // Flatten: expose security fields from the linked users row
    const users = (accounts || []).map((account: any) => {
      const { users: userRow, ...rest } = account
      const linked = Array.isArray(userRow) ? userRow[0] : userRow
      return {
        ...rest,
        ip_risk_score: linked?.ip_risk_score ?? null,
        vpn_suspected: linked?.vpn_suspected ?? false,
      }
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (error: any) {
    console.error("[admin/users] Error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

